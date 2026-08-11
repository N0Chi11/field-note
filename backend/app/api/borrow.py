"""借用申请路由：列表、详情、提交、取消/删除、提交归还、实时冲突检测。"""

from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.card import Card, CardStatus
from app.models.equipment import Equipment, EquipmentStatus
from app.models.user import User
from app.schemas.borrow import (
    BorrowCreate,
    BorrowDetail,
    BorrowResponse,
    ConflictCheckRequest,
    ConflictCheckResponse,
)
from app.schemas.common import ApiResponse
from app.services.conflict_service import check_conflict, generate_work_order_no
from app.services.log_service import add_log
from app.services.upload_service import save_image_upload
from app.services.wecom_notification_service import notify_new_borrow_request

settings = get_settings()

router = APIRouter(prefix="/requests", tags=["借用申请"])

# 处于"活跃"状态的申请（占用设备时间段，参与冲突检测）
ACTIVE_STATUSES = ["pending", "approved", "borrowing", "return_pending"]


def _status_value(s) -> str:
    """将状态枚举或字符串统一转为字符串。"""
    if hasattr(s, "value"):
        return s.value
    return str(s)


def _to_response(r: BorrowRequest) -> BorrowResponse:
    """将 ORM 对象转为 BorrowResponse。"""
    return BorrowResponse(
        id=r.id,
        work_order_no=r.work_order_no,
        user_id=r.user_id,
        equipment_id=r.equipment_id,
        card_id=r.card_id,
        borrow_time=r.borrow_time,
        return_time=r.return_time,
        actual_return=r.actual_return,
        reason=r.reason,
        status=_status_value(r.status),
        approver_id=r.approver_id,
        admin_comment=r.admin_comment,
        return_photo_url=r.return_photo_url,
        created_at=r.created_at,
    )


def _to_detail(r: BorrowRequest) -> BorrowDetail:
    """将 ORM 对象转为 BorrowDetail，拼接关联实体名称。"""
    return BorrowDetail(
        id=r.id,
        work_order_no=r.work_order_no,
        user_id=r.user_id,
        equipment_id=r.equipment_id,
        card_id=r.card_id,
        borrow_time=r.borrow_time,
        return_time=r.return_time,
        actual_return=r.actual_return,
        reason=r.reason,
        status=_status_value(r.status),
        approver_id=r.approver_id,
        admin_comment=r.admin_comment,
        return_photo_url=r.return_photo_url,
        created_at=r.created_at,
        user_name=r.user.name if r.user else "",
        user_student_id=r.user.student_id if r.user else "",
        equipment_name=r.equipment.name if r.equipment else "",
        equipment_category=r.equipment.category if r.equipment else "",
        card_name=r.card.name if r.card else None,
        approver_name=r.approver.name if r.approver else None,
    )


@router.get("/", response_model=ApiResponse)
def list_requests(
    status: Optional[str] = Query(None, description="按状态筛选"),
    keyword: Optional[str] = Query(None, description="工单号/原因模糊搜索"),
    equipment_id: Optional[int] = Query(None, description="按设备ID筛选"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """借用记录列表。普通用户只能看自己的，管理员可看全部。按 created_at 倒序分页。
    例外：按 equipment_id 筛选时不限制用户权限（用于设备时间轴，需看到所有借用记录）。
    """
    try:
        # 自动拒绝过时的 pending 申请（borrow_time 已过且仍 pending）
        from datetime import datetime, timezone
        now_utc = datetime.utcnow()
        expired = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatus.pending,
            BorrowRequest.borrow_time < now_utc,
        ).all()
        for req in expired:
            req.status = BorrowStatus.rejected
            req.admin_comment = "系统自动拒绝：借用时间已过期"
        if expired:
            db.commit()

        query = db.query(BorrowRequest)

        # 权限：普通用户仅能查看自己的记录（但按设备查询时不限制，用于时间轴）
        if current_user.role != "admin" and not equipment_id:
            query = query.filter(BorrowRequest.user_id == current_user.id)

        # 状态筛选
        if status:
            query = query.filter(BorrowRequest.status == status)

        # 设备筛选
        if equipment_id:
            query = query.filter(BorrowRequest.equipment_id == equipment_id)

        # 关键字模糊搜索（工单号 / 借用原因）
        if keyword:
            kw = f"%{keyword}%"
            query = query.filter(
                or_(
                    BorrowRequest.work_order_no.ilike(kw),
                    BorrowRequest.reason.ilike(kw),
                )
            )

        total = query.count()

        items = (
            query.options(
                joinedload(BorrowRequest.user),
                joinedload(BorrowRequest.equipment),
                joinedload(BorrowRequest.card),
                joinedload(BorrowRequest.approver),
            )
            .order_by(BorrowRequest.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    detail_items = [_to_detail(r) for r in items]
    data = {"items": detail_items, "total": total, "page": page, "size": size}
    return ApiResponse(data=data, message="ok")


@router.post("/", response_model=ApiResponse[BorrowResponse])
def create_request(
    req: BorrowCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交借用申请。hard 冲突拒绝（409），soft 冲突仍创建但返回警告。"""
    # 1. 校验设备存在且非维修中
    try:
        equipment = db.query(Equipment).filter(Equipment.id == req.equipment_id).first()
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    if _status_value(equipment.status) == "repair":
        raise HTTPException(status_code=400, detail="设备维修中，无法借用")

    # 2. 校验时间
    if req.return_time <= req.borrow_time:
        raise HTTPException(status_code=400, detail="归还时间必须晚于借用时间")

    # 2.1 校验借用时间不能早于当前时间
    # 注意：borrow_time 已被 _strip_tz 转为 UTC naive，所以用 utcnow() 比较
    from datetime import datetime, timezone
    now = datetime.utcnow()
    if req.borrow_time < now:
        raise HTTPException(status_code=400, detail="借用时间不能早于当前时间")

    # 3. 冲突检测
    try:
        conflict = check_conflict(
            db, req.equipment_id, req.borrow_time, req.return_time
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if conflict["has_conflict"] and conflict["conflict_type"] == "hard":
        # 硬冲突：完全重叠，拒绝提交
        raise HTTPException(
            status_code=409,
            detail={
                "message": "时间冲突（硬冲突），无法提交申请",
                "conflict_type": "hard",
                "conflict_orders": conflict["conflict_orders"],
            },
        )

    # 4. 生成工单号并创建记录
    try:
        wo = generate_work_order_no(db)
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    r = BorrowRequest(
        work_order_no=wo,
        user_id=current_user.id,
        equipment_id=req.equipment_id,
        borrow_time=req.borrow_time,
        return_time=req.return_time,
        reason=req.reason,
        status=BorrowStatus.pending,
    )

    try:
        db.add(r)
        db.commit()
        db.refresh(r)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    # 5. 记录日志（日志失败不影响主流程）
    try:
        add_log(
            db,
            current_user.id,
            "提交申请",
            f"工单 {wo} · {equipment.name} · {req.borrow_time}→{req.return_time}",
            "request",
            r.id,
        )
    except Exception:
        pass

    # 6. 异步通知管理员。通知失败只记录日志，不影响已经成功提交的申请。
    background_tasks.add_task(
        notify_new_borrow_request,
        work_order_no=wo,
        user_name=current_user.name,
        student_id=current_user.student_id,
        equipment_name=equipment.name,
        equipment_code=equipment.code,
        borrow_time=req.borrow_time,
        return_time=req.return_time,
        reason=req.reason,
    )

    # 7. 组装返回信息（soft 冲突包含警告）
    message = "提交成功"
    if conflict["has_conflict"] and conflict["conflict_type"] == "soft":
        message = (
            "提交成功，但存在时间冲突（软冲突），冲突工单："
            f"{', '.join(conflict['conflict_orders'])}"
        )

    return ApiResponse[BorrowResponse](data=_to_response(r), message=message)


@router.post("/check-conflict", response_model=ApiResponse[ConflictCheckResponse])
def check_conflict_api(
    req: ConflictCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """实时冲突检测，返回冲突类型与冲突工单号列表。"""
    try:
        result = check_conflict(
            db,
            req.equipment_id,
            req.borrow_time,
            req.return_time,
            req.exclude_request_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    resp = ConflictCheckResponse(
        has_conflict=result["has_conflict"],
        conflict_type=result["conflict_type"],
        conflict_orders=result["conflict_orders"],
    )
    return ApiResponse[ConflictCheckResponse](data=resp, message="ok")


@router.get("/{request_id}", response_model=ApiResponse[BorrowDetail])
def get_request_detail(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """借用记录详情。普通用户只能看自己的，管理员可看任意。"""
    try:
        r = (
            db.query(BorrowRequest)
            .options(
                joinedload(BorrowRequest.user),
                joinedload(BorrowRequest.equipment),
                joinedload(BorrowRequest.card),
                joinedload(BorrowRequest.approver),
            )
            .filter(BorrowRequest.id == request_id)
            .first()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    if current_user.role != "admin" and r.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权查看此记录")

    return ApiResponse[BorrowDetail](data=_to_detail(r), message="ok")


@router.delete("/{request_id}", response_model=ApiResponse)
def delete_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """取消/删除申请。

    - pending：普通用户可取消自己的（status→cancelled），管理员可硬删除任意
    - borrowing：仅管理员可删除，删除前释放绑定的内存卡
    - 其他状态：仅管理员可硬删除
    """
    try:
        r = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    is_admin = current_user.role == "admin"
    st = _status_value(r.status)

    # 确定操作类型与权限校验
    if st == "pending":
        if not is_admin and r.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权操作此记录")
        action = "cancel" if not is_admin else "delete"
    elif st == "borrowing":
        if not is_admin:
            raise HTTPException(status_code=403, detail="无权操作此记录")
        action = "delete"
    else:
        if not is_admin:
            raise HTTPException(status_code=403, detail="无权操作此记录")
        action = "delete"

    # 记录删除前信息（删除后对象失效）
    wo = r.work_order_no
    target_id = r.id

    try:
        if action == "cancel":
            # 取消：保留记录，状态置为 cancelled
            r.status = BorrowStatus.cancelled
            db.commit()
            db.refresh(r)
            log_action = "取消申请"
            log_detail = f"工单 {wo}"
            msg = "已取消"
        else:
            # 删除仍在占用实物的记录时，释放内存卡和设备。
            # return_pending 代表归还尚未确认，实物同样不能继续占用。
            is_holding_equipment = st in ("borrowing", "return_pending")
            if is_holding_equipment and r.card_id:
                card = db.query(Card).filter(Card.id == r.card_id).first()
                if card:
                    card.status = CardStatus.available
            if is_holding_equipment and r.equipment:
                r.equipment.status = EquipmentStatus.available
            db.delete(r)
            db.commit()
            log_action = "删除申请"
            log_detail = (
                f"工单 {wo}（已释放内存卡）"
                if is_holding_equipment and r.card_id
                else f"工单 {wo}"
            )
            msg = "已删除"
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    # 记录日志（日志失败不影响主流程）
    try:
        add_log(db, current_user.id, log_action, log_detail, "request", target_id)
    except Exception:
        pass

    return ApiResponse(message=msg)


@router.post("/{request_id}/return", response_model=ApiResponse[BorrowResponse])
def submit_return(
    request_id: int,
    file: UploadFile = File(..., description="归还照片"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交归还：上传归还照片，状态由 borrowing 转为 return_pending。"""
    try:
        r = db.query(BorrowRequest).filter(BorrowRequest.id == request_id).first()
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    # 权限：本人或管理员
    is_admin = current_user.role == "admin"
    if not is_admin and r.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此记录")

    # 状态校验：仅 borrowing 可提交归还
    if _status_value(r.status) != "borrowing":
        raise HTTPException(status_code=400, detail="当前状态无法提交归还")

    # 保存归还照片到 UPLOAD_DIR
    filename = save_image_upload(file, settings.UPLOAD_DIR)
    photo_url = f"/uploads/{filename}"

    # 更新归还照片与状态
    try:
        r.return_photo_url = photo_url
        r.status = BorrowStatus.return_pending
        db.commit()
        db.refresh(r)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    # 记录日志
    try:
        add_log(
            db,
            current_user.id,
            "提交归还",
            f"工单 {r.work_order_no}",
            "request",
            r.id,
        )
    except Exception:
        pass

    return ApiResponse[BorrowResponse](
        data=_to_response(r), message="归还已提交，待确认"
    )
