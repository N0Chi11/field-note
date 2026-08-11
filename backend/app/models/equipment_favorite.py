"""用户设备收藏模型。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# MySQL 生产库使用 BIGINT；SQLite 测试库需要 INTEGER 才能保持自增主键语义。
BIGINT_ID = BigInteger().with_variant(Integer, "sqlite")


class EquipmentFavorite(Base):
    """记录用户收藏及上一次已知的设备可借状态。"""

    __tablename__ = "equipment_favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "equipment_id", name="uq_favorite_user_equipment"),
    )

    # 生产库的 users.id / equipment.id 均为 BIGINT，外键列必须完全同型。
    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_ID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    equipment_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey("equipment.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    last_known_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )
