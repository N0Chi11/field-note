"""系统配置模型。

注意：数据库列名为 ``desc``，但 ``desc`` 在 SQL/ORM 上下文中易与降序关键字冲突，
因此 Python 属性使用 ``description``，通过列名映射保持 DB 列名不变。
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemConfig(Base):
    """系统配置表（键值对）。"""

    __tablename__ = "system_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    # Python 属性 description 映射到 DB 列 desc
    description: Mapped[Optional[str]] = mapped_column(
        "desc", String(200), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<SystemConfig key={self.key}>"
