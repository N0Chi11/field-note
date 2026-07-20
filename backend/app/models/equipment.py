"""设备模型。"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.borrow_request import BorrowRequest


class EquipmentStatus(str, enum.Enum):
    """设备状态。"""

    available = "available"
    borrowed = "borrowed"
    repair = "repair"


class Equipment(Base):
    """设备表。"""

    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    icon: Mapped[str] = mapped_column(String(10), default="📦", nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[EquipmentStatus] = mapped_column(
        Enum(EquipmentStatus), default=EquipmentStatus.available, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    borrow_requests: Mapped[List["BorrowRequest"]] = relationship(
        "BorrowRequest", back_populates="equipment"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Equipment id={self.id} code={self.code} name={self.name}>"
