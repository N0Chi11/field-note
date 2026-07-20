"""内存卡管理路由。

提供内存卡列表、增删改接口。
- 列表：所有登录用户可访问
- 增删改：仅管理员
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin, get_current_user
from app.database import get_db
from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.card import Card, CardStatus
from app.models.user import User
from app.schemas.card import CardCreate, CardResponse, CardUpdate
from app.schemas.common import ApiResponse
from app.services.log_service import add_log

router = APIRouter(prefix="/cards", tags=["内存卡管理"])

# 借用申请进行中的状态：处于这些状态时，内存卡不可删除
ACTIVE_STATUSES = [
    BorrowStatus.pending,
    BorrowStatus.approved,
    BorrowStatus.borrowing,
    BorrowStatus.return_pending,
]


def _count_active_borrow_by_card(db: Session, card_id: int) -> int:
    """统计某内存卡处于活跃状态的借用申请数量。"""
    return (
        db.query(BorrowRequest)
        .filter(
            BorrowRequest.card_id == card_id,
            BorrowRequest.status.in_(ACTIVE_STATUSES),
        )
        .count()
    )


# ===== 1. 内存卡列表 =====
@router.get("/", response_model=ApiResponse[List[CardResponse]])
def list_cards(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """内存卡列表，支持按状态筛选。"""
    try:
        query = db.query(Card)
        if status:
            query = query.filter(Card.status == status)
        items = query.order_by(Card.created_at.desc()).all()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[List[CardResponse]](data=items, message="ok")


# ===== 2. 添加内存卡 =====
@router.post("/", response_model=ApiResponse[CardResponse])
def create_card(
    req: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """添加内存卡（管理员）。code 唯一。"""
    try:
        existing = db.query(Card).filter(Card.code == req.code).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="内存卡编码已存在"
        )

    try:
        card = Card(
            code=req.code,
            name=req.name,
            notes=req.notes,
            status=CardStatus.available,
        )
        db.add(card)
        db.flush()
        add_log(
            db,
            current_user.id,
            "添加内存卡",
            f"{card.code} - {card.name}",
            "card",
            card.id,
        )
        db.commit()
        db.refresh(card)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[CardResponse](data=card, message="添加成功")


# ===== 3. 编辑内存卡 =====
@router.put("/{card_id}", response_model=ApiResponse[CardResponse])
def update_card(
    card_id: int,
    req: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """编辑内存卡（管理员）。仅更新传入字段。"""
    try:
        card = db.query(Card).filter(Card.id == card_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="内存卡不存在"
        )

    update_data = req.model_dump(exclude_unset=True)
    try:
        changed_fields = []
        for field, value in update_data.items():
            if not hasattr(card, field):
                continue
            setattr(card, field, value)
            changed_fields.append(field)
        add_log(
            db,
            current_user.id,
            "编辑内存卡",
            f"{card.code} - {card.name} 修改字段: "
            f"{', '.join(changed_fields) if changed_fields else '无'}",
            "card",
            card.id,
        )
        db.commit()
        db.refresh(card)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse[CardResponse](data=card, message="更新成功")


# ===== 4. 删除内存卡 =====
@router.delete("/{card_id}", response_model=ApiResponse)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """删除内存卡（管理员）。存在活跃借用记录则禁止删除。"""
    try:
        card = db.query(Card).filter(Card.id == card_id).first()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="内存卡不存在"
        )

    try:
        active_count = _count_active_borrow_by_card(db, card_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    if active_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"该内存卡有{active_count}条进行中的借用记录，无法删除",
        )

    try:
        code, name = card.code, card.name
        db.delete(card)
        add_log(
            db,
            current_user.id,
            "删除内存卡",
            f"{code} - {name}",
            "card",
            card_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器内部错误",
        )
    return ApiResponse(message="删除成功")
