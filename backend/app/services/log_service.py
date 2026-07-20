"""操作日志记录服务。

提供统一的 add_log 工具函数，将操作日志写入 operation_logs 表。
日志随业务事务一并提交（flush 而非 commit），由调用方统一管理事务。
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.operation_log import OperationLog


def add_log(
    db: Session,
    actor_id: int,
    action: str,
    detail: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    ip: Optional[str] = None,
) -> OperationLog:
    """记录操作日志。

    将日志对象加入会话并 flush（写入数据库但不提交），
    以便与业务操作共用同一事务：业务提交则日志提交，业务回滚则日志回滚。

    Args:
        db: 数据库会话。
        actor_id: 操作人用户 ID。
        action: 操作动作（如 '添加设备'）。
        detail: 操作详情描述。
        target_type: 操作对象类型（如 'equipment' / 'card'）。
        target_id: 操作对象 ID。
        ip: 操作来源 IP 地址。

    Returns:
        已 flush 的 OperationLog 对象（id 已生成）。
    """
    log = OperationLog(
        actor_id=actor_id,
        action=action,
        detail=detail,
        target_type=target_type,
        target_id=target_id,
        ip_address=ip,
    )
    db.add(log)
    db.flush()
    return log
