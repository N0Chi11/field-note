"""借用相关 Schema。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _strip_tz(dt: datetime) -> datetime:
    """去掉时区信息，避免与数据库 naive datetime 比较时报错。"""
    if dt.tzinfo is not None:
        # 转为 UTC 后去掉时区
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


class BorrowTimeRange(BaseModel):
    """UTC storage; same-day equipment use is checked in Shanghai time."""

    borrow_time: datetime
    return_time: datetime

    @field_validator("borrow_time", "return_time")
    @classmethod
    def naive_datetime(cls, value: datetime) -> datetime:
        return _strip_tz(value)

    @model_validator(mode="after")
    def validate_period(self):
        if self.return_time <= self.borrow_time:
            raise ValueError("归还时间必须晚于借用时间")
        school_timezone = timezone(timedelta(hours=8))
        start = self.borrow_time.replace(tzinfo=timezone.utc).astimezone(school_timezone)
        end = self.return_time.replace(tzinfo=timezone.utc).astimezone(school_timezone)
        if start.date() != end.date():
            raise ValueError("设备不可过夜，借用和归还必须在同一天（北京时间）")
        return self


class BorrowCreate(BorrowTimeRange):
    """创建借用申请请求。"""

    equipment_id: int = Field(gt=0)
    reason: str = Field(min_length=1, max_length=200)

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, value):
        return value.strip() if isinstance(value, str) else value


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


class ConflictCheckRequest(BorrowTimeRange):
    """冲突检测请求。"""

    equipment_id: int
    exclude_request_id: Optional[int] = None


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
