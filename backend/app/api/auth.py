"""认证路由：登录、刷新、登出、当前用户、修改密码。"""
from datetime import datetime, timedelta, timezone

import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.database import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import ApiResponse
from app.services.upload_service import delete_managed_upload, save_image_upload

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["认证"])


def _refresh_expires_at() -> datetime:
    """计算 refresh_token 过期时间（naive UTC，兼容 MySQL DATETIME）。"""
    return (datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )).replace(tzinfo=None)


@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """统一登录接口 — 支持用户登录和管理员登录两种模式。

    用户登录：login_type="user", name=姓名, student_id=学号
    - 学号不存在时自动创建用户
    - 学号存在时校验姓名是否匹配

    管理员登录：login_type="admin", name=管理员姓名, password=密码
    - 按姓名查找管理员账户（student_id = 姓名）
    - 校验密码
    """
    if req.login_type == "admin":
        # ===== 管理员登录 =====
        if not req.name or not req.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请输入管理员姓名和密码",
            )
        try:
            user = db.query(User).filter(
                User.student_id == req.name.strip(),
                User.role == "admin",
            ).first()
        except Exception:
            raise HTTPException(status_code=500, detail="服务器内部错误")

        if user is None or not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="管理员姓名或密码错误",
            )
    else:
        # ===== 用户登录 =====
        if not req.name or not req.student_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请输入姓名和学号",
            )
        try:
            user = db.query(User).filter(User.student_id == req.student_id.strip()).first()
        except Exception:
            raise HTTPException(status_code=500, detail="服务器内部错误")

        if user is None:
            # 自动创建新用户
            try:
                user = User(
                    student_id=req.student_id.strip(),
                    name=req.name.strip(),
                    password_hash="",  # 普通用户无密码
                    role="user",
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
                raise HTTPException(status_code=500, detail="创建用户失败")
        else:
            # 已存在用户：校验姓名
            if user.name != req.name.strip():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="姓名与学号不匹配",
                )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )

    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": str(user.id)})

    # 持久化 refresh_token 的 SHA256 哈希
    try:
        db_token = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=_refresh_expires_at(),
            is_revoked=False,
        )
        db.add(db_token)
        db.commit()
        db.refresh(db_token)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    resp = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )
    return ApiResponse[TokenResponse](data=resp, message="登录成功")


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    """使用 refresh_token 刷新，返回新的 access_token（并轮换 refresh_token）。"""
    payload = decode_token(req.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )

    token_hash = hash_token(req.refresh_token)
    try:
        db_token = (
            db.query(RefreshToken)
            .filter(
                RefreshToken.token_hash == token_hash,
                RefreshToken.user_id == user_id_int,
            )
            .first()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    # 令牌已过期由 decode_token 校验；这里校验是否存在于库且未被吊销
    if db_token is None or db_token.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="刷新令牌已失效",
        )

    try:
        user = db.query(User).filter(User.id == user_id_int).first()
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用",
        )

    # 轮换：吊销旧 refresh_token，签发新的并入库
    new_access_token = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    try:
        db_token.is_revoked = True
        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_token(new_refresh_token),
                expires_at=_refresh_expires_at(),
                is_revoked=False,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    resp = TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )
    return ApiResponse[TokenResponse](data=resp, message="刷新成功")


@router.post("/logout", response_model=ApiResponse)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """登出：吊销当前用户所有未吊销的 refresh_token。"""
    try:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == current_user.id,
            RefreshToken.is_revoked.is_(False),
        ).update({RefreshToken.is_revoked: True}, synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    return ApiResponse(message="登出成功")


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息。"""
    user_resp = UserResponse.model_validate(current_user)
    return ApiResponse[UserResponse](data=user_resp, message="ok")


@router.post("/avatar", response_model=ApiResponse[UserResponse])
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace the current user's avatar."""
    avatar_upload_dir = os.path.join(settings.UPLOAD_DIR, "avatars")
    filename = save_image_upload(file, avatar_upload_dir)
    avatar_url = f"/uploads/avatars/{filename}"
    previous_avatar = current_user.avatar_url

    try:
        current_user.avatar_url = avatar_url
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
        try:
            os.remove(os.path.join(avatar_upload_dir, filename))
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="头像更新失败")

    # Delete the previous managed file only after the database update succeeds.
    delete_managed_upload(previous_avatar, avatar_upload_dir)
    return ApiResponse[UserResponse](
        data=UserResponse.model_validate(current_user),
        message="头像更新成功",
    )


@router.put("/password", response_model=ApiResponse)
def change_password(
    req: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改密码：验证旧密码后更新为新密码哈希。"""
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码错误",
        )

    try:
        current_user.password_hash = get_password_hash(req.new_password)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    return ApiResponse(message="密码修改成功")
