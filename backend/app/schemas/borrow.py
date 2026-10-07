"""借用相关 Schema。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _strip_tz(dt: datetime) -> datetime:
    """去掉时区信息，避免与数据库 naive datetime 比较时报错。"""
    if dt.tzinfo is not None:
        # 转为 UTC 后去掉时区
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


class BorrowCreate(BaseModel):
    """创建借用申请请求。"""

    equipment_id: int = Field(gt=0)
    borrow_time: datetime
    return_time: datetime
    reason: str = Field(min_length=1, max_length=200)

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("borrow_time", "return_time")
    @classmethod
    def naive_datetime(cls, v: datetime) -> datetime:
        return _strip_tz(v)


class BorrowResponse(BaseModel):
    """借用申请响应。"""

    id: int
    work_order_no: str
    user_id: int
    equipment_id: int
    card_id: Optional[int] = None
    borrow_time: datetime
    return_time: datetime
    actual_return: Optional[datetime] = None
    reason: str
    status: str
    approver_id: Optional[int] = None
    admin_comment: Optional[str] = None
    return_photo_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BorrowDetail(BorrowResponse):
    """借用申请详情，附带关联实体名称。"""

    user_name: str
    user_student_id: str = ""
    equipment_name: str
    equipment_category: str = ""
    card_name: Optional[str] = None
    approver_name: Optional[str] = None


class ConflictCheckRequest(BaseModel):
    """冲突检测请求。"""

    equipment_id: int
    borrow_time: datetime
    return_time: datetime
    exclude_request_id: Optional[int] = None

    @field_validator("borrow_time", "return_time")
    @classmethod
    def naive_datetime(cls, v: datetime) -> datetime:
        return _strip_tz(v)


class ConflictCheckResponse(BaseModel):
    """冲突检测结果。

    - has_conflict: 是否存在冲突
    - conflict_type: 冲突类型，'hard' 表示时间完全重叠，'soft' 表示相邻/部分重叠
    - conflict_orders: 冲突的工单号列表
    """

    has_conflict: bool
    conflict_type: Optional[str] = None  # 'hard' / 'soft'
    conflict_orders: List[str] = []


class ApproveRequest(BaseModel):
    """审批通过请求。"""

    comment: Optional[str] = None


class RejectRequest(BaseModel):
    """驳回请求。"""

    comment: str = Field(min_length=1, max_length=1000)

    @field_validator("comment", mode="before")
    @classmethod
    def clean_comment(cls, value):
        return value.strip() if isinstance(value, str) else value


class PickupRequest(BaseModel):
    """领取请求（领取设备时绑定内存卡）。"""

    card_id: Optional[int] = None
