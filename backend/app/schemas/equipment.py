"""设备相关 Schema。"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.borrow import BorrowResponse


class EquipmentBase(BaseModel):
    """设备基础字段。"""

    code: str
    name: str
    category: str
    icon: str = "equipment"
    notes: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    """创建设备请求。"""

    status: str = "available"


class EquipmentUpdate(BaseModel):
    """更新设备请求，所有字段可选。"""

    name: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class EquipmentResponse(EquipmentBase):
    """设备响应。"""

    id: int
    status: str
    image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EquipmentTimeline(EquipmentResponse):
    """设备详情 + 借用历史时间线。"""

    borrow_history: List[BorrowResponse] = []

    model_config = ConfigDict(from_attributes=True)
