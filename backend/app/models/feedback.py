"""用户反馈模型。"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


BIGINT_ID = BigInteger().with_variant(Integer, "sqlite")


class FeedbackType(str, enum.Enum):
    bug = "bug"
    suggestion = "suggestion"
    other = "other"


class FeedbackStatus(str, enum.Enum):
    open = "open"
    reviewed = "reviewed"
    resolved = "resolved"


class Feedback(Base):
    """用户提交的网页问题、建议和其他意见。"""

    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_ID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feedback_type: Mapped[FeedbackType] = mapped_column(
        Enum(FeedbackType), default=FeedbackType.suggestion, nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    contact: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[FeedbackStatus] = mapped_column(
        Enum(FeedbackStatus), default=FeedbackStatus.open, nullable=False, index=True
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    handled_by_id: Mapped[int | None] = mapped_column(
        BIGINT_ID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id])
    handled_by = relationship("User", foreign_keys=[handled_by_id])
