"""用户反馈与管理员处理接口。"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_admin, get_current_user
from app.database import get_db
from app.models.feedback import Feedback, FeedbackStatus, FeedbackType
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, FeedbackUpdate
from app.services.log_service import add_log

router = APIRouter(tags=["用户反馈"])


def _payload(item: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=item.id,
        feedback_type=item.feedback_type.value,
        content=item.content,
        contact=item.contact,
        status=item.status.value,
        admin_note=item.admin_note,
        user_name=item.user.name if item.user else "",
        user_student_id=item.user.student_id if item.user else "",
        handler_name=item.handled_by.name if item.handled_by else None,
        handled_at=item.handled_at,
        created_at=item.created_at,
    )


@router.post("/feedback", response_model=ApiResponse[FeedbackResponse])
def create_feedback(
    req: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = req.content.strip()
    if len(content) < 5:
        raise HTTPException(status_code=400, detail="反馈内容至少填写 5 个字")
    item = Feedback(
        user_id=current_user.id,
        feedback_type=FeedbackType(req.feedback_type),
        content=content,
        contact=req.contact.strip() if req.contact else None,
    )
    try:
        db.add(item)
        add_log(db, current_user.id, "提交反馈", "用户提交了一条网页反馈", "feedback", None)
        db.commit()
        db.refresh(item)
        item = db.query(Feedback).options(joinedload(Feedback.user)).filter(Feedback.id == item.id).one()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="反馈提交失败")
    return ApiResponse(data=_payload(item), message="感谢反馈，我们会认真查看")


@router.get("/feedback/mine", response_model=ApiResponse[list[FeedbackResponse]])
def list_my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """用户查看自己的反馈及管理员公开的处理说明。"""
    rows = (
        db.query(Feedback)
        .options(joinedload(Feedback.user), joinedload(Feedback.handled_by))
        .filter(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
    return ApiResponse(data=[_payload(item) for item in rows], message="ok")


@router.get("/admin/feedback", response_model=ApiResponse[PaginatedResponse[FeedbackResponse]])
def list_feedback(
    status: str | None = Query(None, pattern="^(open|reviewed|resolved)$"),
    feedback_type: str | None = Query(None, pattern="^(bug|suggestion|other)$"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Feedback).options(joinedload(Feedback.user), joinedload(Feedback.handled_by))
    if status:
        query = query.filter(Feedback.status == FeedbackStatus(status))
    if feedback_type:
        query = query.filter(Feedback.feedback_type == FeedbackType(feedback_type))
    total = query.count()
    rows = query.order_by(Feedback.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return ApiResponse(
        data=PaginatedResponse(items=[_payload(item) for item in rows], total=total, page=page, size=size),
        message="ok",
    )


@router.put("/admin/feedback/{feedback_id}", response_model=ApiResponse[FeedbackResponse])
def update_feedback(
    feedback_id: int,
    req: FeedbackUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    item = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="反馈不存在")
    try:
        item.status = FeedbackStatus(req.status)
        item.admin_note = req.admin_note.strip() if req.admin_note else None
        item.handled_by_id = current_user.id
        item.handled_at = datetime.now()
        add_log(db, current_user.id, "处理反馈", f"处理反馈 #{feedback_id}", "feedback", feedback_id)
        db.commit()
        item = db.query(Feedback).options(joinedload(Feedback.user), joinedload(Feedback.handled_by)).filter(Feedback.id == feedback_id).one()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="反馈状态更新失败")
    return ApiResponse(data=_payload(item), message="反馈状态已更新")
