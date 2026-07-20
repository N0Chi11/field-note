"""内存卡相关 Schema。"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CardBase(BaseModel):
    """内存卡基础字段。"""

    code: str
    name: str
    notes: Optional[str] = None


class CardCreate(CardBase):
    """创建内存卡请求。"""


class CardUpdate(BaseModel):
    """更新内存卡请求，所有字段可选。"""

    name: Optional[str] = None
    notes: Optional[str] = None


class CardResponse(CardBase):
    """内存卡响应。"""

    id: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
