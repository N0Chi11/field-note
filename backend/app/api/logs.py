"""操作日志路由。

提供操作日志列表查询接口，仅管理员可访问：
- 支持 action / actor_id 筛选
- 按 created_at 倒序
- 分页返回，每条记录含操作人姓名（关联 users 表）
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.database import get_db
from app.models.operation_log import OperationLog
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse

router = APIRouter(
    prefix="/admin/logs",
    tags=["操作日志"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/", response_model=ApiResponse[PaginatedResponse[Dict[str, Any]]])
def list_logs(
    action: Optional[str] = Query(None, description="按操作动作筛选"),
    actor_id: Optional[int] = Query(None, description="按操作人 ID 筛选"),
    page: int = Query(1, ge=1, description="页码，从 1 开始"),
    size: int = Query(50, ge=1, le=200, description="每页条数"),
    db: Session = Depends(get_db),
):
    """操作日志列表（分页，按 created_at 倒序）。

    每条记录字段：id, actor_name, action, detail, target_type, target_id, created_at。
    actor_name 通过 join users 表获取。
    """
    # 基础查询：OperationLog join users，复用筛选与计数
    base = db.query(OperationLog).join(User, OperationLog.actor_id == User.id)

    if action:
        base = base.filter(OperationLog.action == action)
    if actor_id is not None:
        base = base.filter(OperationLog.actor_id == actor_id)

    # 总数
    total = base.count()

    # 分页数据：选取所需字段（含 actor_name）
    offset = (page - 1) * size
    rows = (
        base.with_entities(
            OperationLog.id,
            User.name.label("actor_name"),
            OperationLog.action,
            OperationLog.detail,
            OperationLog.target_type,
            OperationLog.target_id,
            OperationLog.created_at,
        )
        .order_by(OperationLog.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    items: List[Dict[str, Any]] = [
        {
            "id": row.id,
            "actor_name": row.actor_name,
            "action": row.action,
            "detail": row.detail,
            "target_type": row.target_type,
            "target_id": row.target_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]

    paginated = PaginatedResponse[Dict[str, Any]](
        items=items, total=total, page=page, size=size
    )
    return ApiResponse[PaginatedResponse[Dict[str, Any]]](
        data=paginated, message="ok"
    )
