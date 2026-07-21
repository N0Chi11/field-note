"""借用相关 Schema。"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class BorrowCreate(BaseModel):
    """创建借用申请请求。"""

    equipment_id: int
    borrow_time: datetime
    return_time: datetime
    reason: str


class BorrowResponse(BaseModel):
    """借用申请响应。"""

    id: int
    work_order_no: str
    user_id: int
    equipment_id: int
    card_id: Optional[int] = None
    borrow_time: datetime
    return_time: datetime
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

    comment: str


class PickupRequest(BaseModel):
    """领取请求（领取设备时绑定内存卡）。"""

    card_id: Optional[int] = None
