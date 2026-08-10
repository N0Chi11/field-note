"""Best-effort notifications for the WeCom group robot."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)


def _one_line(value: str, limit: int) -> str:
    """Keep user-supplied fields compact and prevent multiline message spoofing."""
    compact = " ".join(str(value).split())
    return compact if len(compact) <= limit else f"{compact[: limit - 1]}…"


def _valid_wecom_webhook(url: str) -> bool:
    """Only allow the official WeCom robot endpoint."""
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    return (
        parsed.scheme == "https"
        and parsed.hostname == "qyapi.weixin.qq.com"
        and parsed.path == "/cgi-bin/webhook/send"
        and bool(query.get("key", [""])[0])
    )


def _format_time(value: datetime, timezone_name: str) -> str:
    """Render stored UTC datetimes in the deployment timezone."""
    try:
        target_timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        target_timezone = (
            timezone(timedelta(hours=8))
            if timezone_name == "Asia/Shanghai"
            else timezone.utc
        )

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(target_timezone).strftime("%Y-%m-%d %H:%M")


def build_borrow_notification_payload(
    *,
    work_order_no: str,
    user_name: str,
    student_id: str,
    equipment_name: str,
    equipment_code: str,
    borrow_time: datetime,
    return_time: datetime,
    reason: str,
    mentioned_mobiles: Iterable[str] = (),
    public_url: str = "",
    timezone_name: str = "Asia/Shanghai",
) -> Dict[str, Any]:
    """Build the WeCom text message without exposing the webhook secret."""
    lines = [
        "【新的设备借用申请】",
        "",
        f"工单号：{_one_line(work_order_no, 80)}",
        f"申请人：{_one_line(user_name, 50)}（{_one_line(student_id, 30)}）",
        f"设备：{_one_line(equipment_name, 100)}（{_one_line(equipment_code, 30)}）",
        f"借用时间：{_format_time(borrow_time, timezone_name)}",
        f"归还时间：{_format_time(return_time, timezone_name)}",
        f"用途：{_one_line(reason, 300)}",
        "",
        "请管理员及时进入系统审批。",
    ]
    if public_url.strip():
        lines.append(f"系统地址：{public_url.strip().rstrip('/')}")

    mobiles = [mobile.strip() for mobile in mentioned_mobiles if mobile.strip()]
    return {
        "msgtype": "text",
        "text": {
            "content": "\n".join(lines),
            "mentioned_mobile_list": mobiles,
        },
    }


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
    """Send a notification; failures are logged and never break the request flow."""
    # Import lazily so payload construction stays dependency-free and easy to test.
    from app.config import get_settings

    settings = get_settings()
    webhook_url = settings.WECOM_BOT_WEBHOOK.strip()
    if not webhook_url:
        logger.info("WeCom notification skipped: webhook is not configured")
        return False
    if not _valid_wecom_webhook(webhook_url):
        logger.error("WeCom notification skipped: invalid webhook endpoint")
        return False

    payload = build_borrow_notification_payload(
        work_order_no=work_order_no,
        user_name=user_name,
        student_id=student_id,
        equipment_name=equipment_name,
        equipment_code=equipment_code,
        borrow_time=borrow_time,
        return_time=return_time,
        reason=reason,
        mentioned_mobiles=settings.wecom_mentioned_mobiles_list,
        public_url=settings.SYSTEM_PUBLIC_URL,
        timezone_name=getattr(settings, "TZ", "Asia/Shanghai"),
    )
    request = Request(
        webhook_url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
        if result.get("errcode") != 0:
            logger.warning(
                "WeCom notification rejected for work order %s: errcode=%s errmsg=%s",
                work_order_no,
                result.get("errcode"),
                result.get("errmsg"),
            )
            return False
        logger.info("WeCom notification sent for work order %s", work_order_no)
        return True
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        logger.warning(
            "WeCom notification failed for work order %s: %s",
            work_order_no,
            exc,
        )
        return False
