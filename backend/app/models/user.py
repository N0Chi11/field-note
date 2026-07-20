"""用户模型。"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.borrow_request import BorrowRequest


class UserRole(str, enum.Enum):
    """用户角色。"""

    user = "user"
    admin = "admin"


class User(Base):
    """用户表。"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), default=UserRole.user, nullable=False
    )
    openid: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    # 该用户发起的借用申请（通过 user_id 关联，需指定 foreign_keys 以消除与 approver_id 的歧义）
    borrow_requests: Mapped[List["BorrowRequest"]] = relationship(
        "BorrowRequest",
        back_populates="user",
        foreign_keys="BorrowRequest.user_id",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<User id={self.id} student_id={self.student_id} role={self.role}>"
        )
