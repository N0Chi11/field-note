"""管理员审批路由。

提供：
- 仪表盘统计（待审核 / 借用中 / 待归还确认 / 总申请数）
- 待审批列表
- 审批通过（含维修状态检查 + 冲突复查）
- 拒绝申请
- 确认领取（可选配内存卡，状态→borrowing）
- 确认归还完成（释放内存卡，状态→returned）

所有接口仅管理员可访问。
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.card import Card, CardStatus
from app.models.equipment import Equipment, EquipmentStatus
from app.models.feedback import Feedback, FeedbackStatus
from app.models.user import User
from app.schemas.borrow import ApproveRequest, BorrowDetail, PickupRequest, RejectRequest
from app.schemas.common import ApiResponse
from app.services.conflict_service import check_conflict, validate_transition
from app.services.favorite_service import mark_favorites_unavailable
from app.services.log_service import add_log

router = APIRouter(
    prefix="/admin",
    tags=["管理员审批"],
    dependencies=[Depends(get_current_admin)],
)


def _status_value(s) -> str:
    """将状态枚举或字符串统一转为字符串。"""
    if hasattr(s, "value"):
        return s.value
    return str(s)


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


# ===== 1. 仪表盘统计 =====
@router.get("/stats", response_model=ApiResponse)
def get_stats(
    db: Session = Depends(get_db),
):
    """仪表盘统计：待审核 / 借用中 / 待归还确认 / 总申请数。"""
    try:
        total = db.query(BorrowRequest).count()
        pending = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatus.pending
        ).count()
        borrowing = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatus.borrowing
        ).count()
        return_pending = db.query(BorrowRequest).filter(
            BorrowRequest.status == BorrowStatus.return_pending
        ).count()
        feedback_open = db.query(Feedback).filter(
            Feedback.status == FeedbackStatus.open
        ).count()
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    data = {
        "total": total,
        "pending": pending,
        "borrowing": borrowing,
        "return_pending": return_pending,
        "feedback_open": feedback_open,
    }
    return ApiResponse(data=data, message="ok")


# ===== 2. 待审批列表 =====
@router.get("/requests/pending", response_model=ApiResponse)
def list_pending_requests(
    db: Session = Depends(get_db),
):
    """待审批列表：返回 pending 和 approved 状态的申请，按 created_at 倒序。"""
    try:
        items = (
            db.query(BorrowRequest)
            .options(
                joinedload(BorrowRequest.user),
                joinedload(BorrowRequest.equipment),
                joinedload(BorrowRequest.card),
                joinedload(BorrowRequest.approver),
            )
            .filter(
                BorrowRequest.status.in_([
                    BorrowStatus.pending,
                    BorrowStatus.approved,
                ])
            )
            .order_by(BorrowRequest.created_at.desc())
            .all()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    detail_items = [_to_detail(r) for r in items]
    return ApiResponse(data=detail_items, message="ok")


# ===== 3. 审批通过 =====
@router.post("/requests/{request_id}/approve", response_model=ApiResponse)
def approve_request(
    request_id: int,
    req: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """审批通过。

    校验：
    - 状态转换合法性（pending→approved）
    - 设备非维修状态
    - 冲突复查（hard 冲突拒绝）
    """
    try:
        r = (
            db.query(BorrowRequest)
            .options(joinedload(BorrowRequest.equipment))
            .filter(BorrowRequest.id == request_id)
            .first()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    current_st = _status_value(r.status)
    if not validate_transition(current_st, "approved"):
        raise HTTPException(status_code=400, detail="当前状态不允许此操作")

    if r.return_time <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="借用时段已结束，请拒绝该申请并让用户重新提交")

    # 设备维修状态检查
    if r.equipment and _status_value(r.equipment.status) == "repair":
        raise HTTPException(status_code=400, detail="该设备正在维修中，无法通过审批")

    # 冲突复查
    try:
        conflict = check_conflict(
            db, r.equipment_id, r.borrow_time, r.return_time, r.id
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if conflict["has_conflict"] and conflict["conflict_type"] == "hard":
        raise HTTPException(
            status_code=409,
            detail={
                "message": "强冲突！该设备在此时段已被占用",
                "conflict_type": "hard",
                "conflict_orders": conflict["conflict_orders"],
            },
        )

    try:
        r.status = BorrowStatus.approved
        r.approver_id = current_user.id
        r.admin_comment = req.comment or ""
        add_log(
            db,
            current_user.id,
            "审批通过",
            f"工单 {r.work_order_no} · {r.equipment.name if r.equipment else r.equipment_id}"
            + (f" · {req.comment}" if req.comment else ""),
            "request",
            r.id,
        )
        db.commit()
        db.refresh(r)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    return ApiResponse(data=_to_detail(r), message="审批通过")


# ===== 4. 拒绝申请 =====
@router.post("/requests/{request_id}/reject", response_model=ApiResponse)
def reject_request(
    request_id: int,
    req: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """拒绝申请。需提供拒绝理由。"""
    try:
        r = (
            db.query(BorrowRequest)
            .filter(BorrowRequest.id == request_id)
            .first()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    current_st = _status_value(r.status)
    if not validate_transition(current_st, "rejected"):
        raise HTTPException(status_code=400, detail="当前状态不允许此操作")

    try:
        r.status = BorrowStatus.rejected
        r.approver_id = current_user.id
        r.admin_comment = req.comment
        eq_name = ""
        if r.equipment:
            eq_name = r.equipment.name
        add_log(
            db,
            current_user.id,
            "拒绝申请",
            f"工单 {r.work_order_no} · {eq_name} · 理由：{req.comment}",
            "request",
            r.id,
        )
        db.commit()
        db.refresh(r)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    return ApiResponse(data=_to_detail(r), message="已拒绝")


# ===== 5. 确认领取 =====
@router.post("/requests/{request_id}/pickup", response_model=ApiResponse)
def confirm_pickup(
    request_id: int,
    req: PickupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """确认领取。可选配内存卡（card_id），状态→borrowing。

    若指定 card_id：
    - 校验内存卡存在且为 available
    - 将卡状态标记为 borrowed
    """
    try:
        r = (
            db.query(BorrowRequest)
            .filter(BorrowRequest.id == request_id)
            .first()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    current_st = _status_value(r.status)
    if not validate_transition(current_st, "borrowing"):
        raise HTTPException(status_code=400, detail="当前状态不允许此操作")

    if r.equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")
    if _status_value(r.equipment.status) == "repair":
        raise HTTPException(status_code=400, detail="该设备正在维修中，无法领取")
    if r.return_time <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="借用时段已结束，请重新提交申请")

    # 检查设备是否已被借用（有 borrowing 状态的记录）
    active_borrow = db.query(BorrowRequest).filter(
        BorrowRequest.equipment_id == r.equipment_id,
        BorrowRequest.status.in_([
            BorrowStatus.borrowing,
            BorrowStatus.return_pending,
        ]),
        BorrowRequest.id != request_id,
    ).first()
    if active_borrow:
        raise HTTPException(
            status_code=400,
            detail=f"设备已被 {active_borrow.user.name if active_borrow.user else '其他用户'} 借用中（工单 {active_borrow.work_order_no}），请先确认归还后再让下一位领取"
        )

    # 内存卡绑定（可选）
    card_name = ""
    if req.card_id:
        try:
            card = db.query(Card).filter(Card.id == req.card_id).first()
        except Exception:
            raise HTTPException(status_code=500, detail="服务器内部错误")
        if card is None:
            raise HTTPException(status_code=404, detail="内存卡不存在")
        if _status_value(card.status) != "available":
            raise HTTPException(status_code=400, detail="该内存卡已被配出，无法选择")

        try:
            r.card_id = card.id
            card.status = CardStatus.borrowed
            card_name = f"{card.code} - {card.name}"
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="服务器内部错误")

    try:
        r.status = BorrowStatus.borrowing
        if r.equipment:
            r.equipment.status = EquipmentStatus.borrowed
            mark_favorites_unavailable(db, r.equipment_id)
        eq_name = r.equipment.name if r.equipment else str(r.equipment_id)
        detail = f"工单 {r.work_order_no} · {eq_name}"
        if card_name:
            detail += f" · 配卡 {card_name}"
        add_log(
            db,
            current_user.id,
            "确认领取",
            detail,
            "request",
            r.id,
        )
        db.commit()
        db.refresh(r)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    return ApiResponse(data=_to_detail(r), message="已确认领取")


# ===== 6. 确认归还完成 =====
@router.post("/requests/{request_id}/confirm-return", response_model=ApiResponse)
def confirm_return(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """确认归还完成。释放绑定的内存卡，状态→returned。"""
    try:
        r = (
            db.query(BorrowRequest)
            .filter(BorrowRequest.id == request_id)
            .first()
        )
    except Exception:
        raise HTTPException(status_code=500, detail="服务器内部错误")

    if r is None:
        raise HTTPException(status_code=404, detail="借用记录不存在")

    current_st = _status_value(r.status)
    if not validate_transition(current_st, "returned"):
        raise HTTPException(status_code=400, detail="当前状态不允许此操作")

    # 释放内存卡
    card_released = False
    card_name = ""
    if r.card_id:
        try:
            card = db.query(Card).filter(Card.id == r.card_id).first()
        except Exception:
            raise HTTPException(status_code=500, detail="服务器内部错误")
        if card:
            card.status = CardStatus.available
            card_released = True
            card_name = f"{card.code} - {card.name}"

    try:
        r.status = BorrowStatus.returned
        r.actual_return = datetime.utcnow()
        if r.equipment:
            r.equipment.status = EquipmentStatus.available
        eq_name = r.equipment.name if r.equipment else str(r.equipment_id)
        detail = f"工单 {r.work_order_no} · {eq_name}"
        if card_released:
            detail += f" · 卡 {card_name} 已释放"
        add_log(
            db,
            current_user.id,
            "确认归还",
            detail,
            "request",
            r.id,
        )
        db.commit()
        db.refresh(r)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="服务器内部错误")

    return ApiResponse(data=_to_detail(r), message="归还确认完成")
