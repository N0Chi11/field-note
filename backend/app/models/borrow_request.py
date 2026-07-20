"""借用申请模型。"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.card import Card
    from app.models.equipment import Equipment
    from app.models.user import User


class BorrowStatus(str, enum.Enum):
    """借用申请状态。"""

    pending = "pending"
    approved = "approved"
    borrowing = "borrowing"
    return_pending = "return_pending"
    returned = "returned"
    rejected = "rejected"
    cancelled = "cancelled"


class BorrowRequest(Base):
    """借用申请表。"""

    __tablename__ = "borrow_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_order_no: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    equipment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("equipment.id"), nullable=False, index=True
    )
    card_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("cards.id"), nullable=True, index=True
    )
    borrow_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    return_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    actual_return: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[BorrowStatus] = mapped_column(
        Enum(BorrowStatus), default=BorrowStatus.pending, nullable=False, index=True
    )
    approver_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    admin_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    return_photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="borrow_requests",
        foreign_keys=[user_id],
    )
    equipment: Mapped["Equipment"] = relationship(
        "Equipment", back_populates="borrow_requests"
    )
    card: Mapped[Optional["Card"]] = relationship(
        "Card", back_populates="borrow_requests"
    )
    approver: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[approver_id]
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<BorrowRequest id={self.id} work_order_no={self.work_order_no} "
            f"status={self.status}>"
        )
