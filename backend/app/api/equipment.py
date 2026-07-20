"""设备管理路由。

提供设备列表、详情（含借用时间轴）、增删改、状态切换、图片上传等接口。
- 列表 / 详情：所有登录用户可访问
- 增删改 / 状态切换 / 图片上传：仅管理员
"""

from __future__ import annotations

import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_admin, get_current_user
from app.database import get_db
from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.equipment import Equipment, EquipmentStatus
from app.models.user import User
from app.schemas.borrow import BorrowResponse
from app.schemas.common import ApiResponse
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
)
from app.services.log_service import add_log

router = APIRouter(prefix="/equipment", tags=["设备管理"])

settings = get_settings()

# 借用申请进行中的状态：处于这些状态时，设备不可删除 / 不可设为维修
ACTIVE_STATUSES = [
    BorrowStatus.pending,
    BorrowStatus.approved,
    BorrowStatus.borrowing,
    BorrowStatus.return_pending,
]


class StatusUpdateRequest(BaseModel):
    """设备状态切换请求体。"""

    status: str


def _count_active_borrow(db: Session, equipment_id: int) -> int:
    """统计某设备处于活跃状态的借用申请数量。"""
    return (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.equipment_id == equipment_id,
            BorrowRequest.status.in_(ACTIVE_STATUSES),
        )
        .count()
    )


# ===== 1. 设备列表 =====
@router.get("/", response_model=ApiResponse[List[EquipmentResponse]])
def list_equipment(
    status: Optional[str] = None,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """设备列表，支持按状态 / 分类筛选及关键字搜索（code/name）。"""
    try:
        query = db.query(Equipment)
        if status:
            query = query.filter(Equipment.status == status)
        if category:
            query = query.filter(Equipment.category == category)
        if keyword:
            like = f"%{keyword}%"
            query = query.filter(
                (Equipment.code.like(like)) | (Equipment.name.like(like))
            )
        items = query.order_by(Equipment.created_at.desc()).all()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[List[EquipmentResponse]](data=items, message="ok")


# ===== 2. 设备详情 + 借用时间轴 =====
@router.get("/{equipment_id}", response_model=ApiResponse)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """设备详情 + 该设备历史借用记录（按 created_at 倒序）。"""
    try:
        eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if eq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在"
        )

    try:
        history = (
            db.query(BorrowRequest)
            .filter(BorrowRequest.equipment_id == equipment_id)
            .order_by(BorrowRequest.created_at.desc())
            .all()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )

    data = {
        "equipment": EquipmentResponse.model_validate(eq).model_dump(mode="json"),
        "borrow_history": [
            BorrowResponse.model_validate(h).model_dump(mode="json") for h in history
        ],
    }
    return ApiResponse(data=data, message="ok")


# ===== 3. 添加设备 =====
@router.post("/", response_model=ApiResponse[EquipmentResponse])
def create_equipment(
    req: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """添加设备（管理员）。code 唯一。"""
    try:
        existing = db.query(Equipment).filter(Equipment.code == req.code).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="设备编码已存在"
        )

    try:
        eq_status = EquipmentStatus(req.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="无效的设备状态"
        )

    try:
        eq = Equipment(
            code=req.code,
            name=req.name,
            category=req.category,
            icon=req.icon,
            notes=req.notes,
            status=eq_status,
        )
        db.add(eq)
        db.flush()
        add_log(
            db,
            current_user.id,
            "添加设备",
            f"{eq.code} - {eq.name}",
            "equipment",
            eq.id,
        )
        db.commit()
        db.refresh(eq)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[EquipmentResponse](data=eq, message="添加成功")


# ===== 4. 编辑设备 =====
@router.put("/{equipment_id}", response_model=ApiResponse[EquipmentResponse])
def update_equipment(
    equipment_id: int,
    req: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """编辑设备（管理员）。仅更新传入字段。

    若 status 改为 repair，需校验该设备无活跃借用申请。
    """
    try:
        eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if eq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在"
        )

    update_data = req.model_dump(exclude_unset=True)

    # 若将状态改为 repair，校验活跃借用
    new_status = update_data.get("status")
    if new_status == EquipmentStatus.repair.value:
        try:
            active_count = _count_active_borrow(db, equipment_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器内部错误",
            )
        if active_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"该设备有{active_count}条进行中的借用记录，无法设为维修",
            )

    try:
        changed_fields = []
        for field, value in update_data.items():
            if not hasattr(eq, field):
                continue
            if field == "status":
                try:
                    value = EquipmentStatus(value)
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="无效的设备状态",
                    )
            setattr(eq, field, value)
            changed_fields.append(field)
        add_log(
            db,
            current_user.id,
            "编辑设备",
            f"{eq.code} - {eq.name} 修改字段: "
            f"{', '.join(changed_fields) if changed_fields else '无'}",
            "equipment",
            eq.id,
        )
        db.commit()
        db.refresh(eq)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[EquipmentResponse](data=eq, message="更新成功")


# ===== 5. 删除设备 =====
@router.delete("/{equipment_id}", response_model=ApiResponse)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """删除设备（管理员）。存在活跃借用记录则禁止删除。"""
    try:
        eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if eq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在"
        )

    try:
        active_count = _count_active_borrow(db, equipment_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if active_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该设备有{active_count}条进行中的借用记录，无法删除",
        )

    try:
        code, name = eq.code, eq.name
        db.delete(eq)
        add_log(
            db,
            current_user.id,
            "删除设备",
            f"{code} - {name}",
            "equipment",
            equipment_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse(message="删除成功")


# ===== 6. 切换设备状态 =====
@router.patch("/{equipment_id}/status", response_model=ApiResponse[EquipmentResponse])
def change_equipment_status(
    equipment_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """切换设备状态：repair / available（管理员）。

    设为 repair 时校验活跃借用记录。
    """
    try:
        eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if eq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在"
        )

    try:
        new_status = EquipmentStatus(payload.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="无效的设备状态"
        )

    if new_status == EquipmentStatus.repair:
        try:
            active_count = _count_active_borrow(db, equipment_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器内部错误",
            )
        if active_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"该设备有{active_count}条进行中的借用记录，无法设为维修",
            )

    try:
        eq.status = new_status
        action_text = (
            "设备设为维修"
            if new_status == EquipmentStatus.repair
            else "设备设为可用"
        )
        add_log(
            db,
            current_user.id,
            action_text,
            f"{eq.code} - {eq.name}",
            "equipment",
            eq.id,
        )
        db.commit()
        db.refresh(eq)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[EquipmentResponse](data=eq, message="状态更新成功")


# ===== 7. 上传设备图片 =====
@router.post("/{equipment_id}/image", response_model=ApiResponse[EquipmentResponse])
def upload_equipment_image(
    equipment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """上传设备图片（管理员）。

    保存到 settings.UPLOAD_DIR，文件名使用 uuid + 原扩展名，
    并更新设备 image_url。
    """
    try:
        eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if eq is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在"
        )

    # 读取文件内容
    try:
        contents = file.file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="文件读取失败"
        )
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="上传文件为空"
        )

    # 文件名：uuid + 原扩展名
    original_name = file.filename or ""
    ext = os.path.splitext(original_name)[1].lower()
    filename = f"{uuid.uuid4().hex}{ext}"

    upload_dir = settings.UPLOAD_DIR
    try:
        os.makedirs(upload_dir, exist_ok=True)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )

    save_path = os.path.join(upload_dir, filename)
    try:
        with open(save_path, "wb") as f:
            f.write(contents)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="文件保存失败",
        )

    # 静态访问路径
    image_url = f"/uploads/{filename}"
    try:
        eq.image_url = image_url
        add_log(
            db,
            current_user.id,
            "上传设备图片",
            f"{eq.code} - {eq.name}",
            "equipment",
            eq.id,
        )
        db.commit()
        db.refresh(eq)
    except Exception:
        db.rollback()
        # 数据库更新失败时清理已落盘文件，保持一致
        try:
            os.remove(save_path)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[EquipmentResponse](data=eq, message="图片上传成功")
