"""Notification provider selection for FIELD NOTE."""

from datetime import datetime


def notify_new_borrow_request(
    *,
    work_order_no: str,
    user_name: str,
    student_id: str,
    equipment_name: str,
    equipment_code: str,
    borrow_time: datetime,
    return_time: datetime,
    reason: str,
) -> bool:
    """Use ServerChan when configured; retain WeCom as a legacy fallback."""
    from app.config import get_settings

    settings = get_settings()
    if settings.serverchan_sendkeys_list:
        from app.services.serverchan_notification_service import (
            notify_new_borrow_request as notify_serverchan,
        )

        return notify_serverchan(
            work_order_no=work_order_no,
            user_name=user_name,
            student_id=student_id,
            equipment_name=equipment_name,
            equipment_code=equipment_code,
            borrow_time=borrow_time,
            return_time=return_time,
            reason=reason,
        )

    from app.services.wecom_notification_service import notify_new_borrow_request as notify_wecom

    return notify_wecom(
        work_order_no=work_order_no,
        user_name=user_name,
        student_id=student_id,
        equipment_name=equipment_name,
        equipment_code=equipment_code,
        borrow_time=borrow_time,
        return_time=return_time,
        reason=reason,
    )
