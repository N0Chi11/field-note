"""Best-effort WeChat notifications delivered through ServerChan.

SendKeys are deployment secrets.  They must never be included in a response,
exception, or log message.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, Iterable, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.services.wecom_notification_service import _format_time, _one_line

logger = logging.getLogger(__name__)

_SENDKEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,256}$")
_SERVERCHAN3_PATTERN = re.compile(r"^sctp(\d+)t[A-Za-z0-9_-]+$")


def serverchan_endpoint(sendkey: str) -> Optional[str]:
    """Return the official endpoint for a SendKey, or None for malformed input."""
    key = sendkey.strip()
    if not _SENDKEY_PATTERN.fullmatch(key):
        return None

    serverchan3 = _SERVERCHAN3_PATTERN.fullmatch(key)
    if serverchan3:
        return f"https://{serverchan3.group(1)}.push.ft07.com/send/{key}.send"
    return f"https://sctapi.ftqq.com/{key}.send"


def build_borrow_notification_message(
    *,
    work_order_no: str,
    user_name: str,
    equipment_name: str,
    equipment_code: str,
    borrow_time: datetime,
    return_time: datetime,
    reason: str,
    public_url: str = "",
    timezone_name: str = "Asia/Shanghai",
) -> Dict[str, str]:
    """Build a compact Markdown notification without including student IDs."""
    lines = [
        "## 新的设备借用申请",
        "",
        f"- **工单号**：{_one_line(work_order_no, 80)}",
        f"- **申请人**：{_one_line(user_name, 50)}",
        f"- **设备**：{_one_line(equipment_name, 100)}（{_one_line(equipment_code, 30)}）",
        f"- **借用时间**：{_format_time(borrow_time, timezone_name)}",
        f"- **归还时间**：{_format_time(return_time, timezone_name)}",
        f"- **用途**：{_one_line(reason, 300)}",
        "",
        "请及时进入 FIELD NOTE 审批。",
    ]
    if public_url.strip():
        url = public_url.strip().rstrip("/")
        lines.append(f"[进入系统审批]({url})")

    return {
        "title": "FIELD NOTE｜新的借用申请",
        "desp": "\n".join(lines),
    }


def _send(sendkey: str, message: Dict[str, str]) -> bool:
    endpoint = serverchan_endpoint(sendkey)
    if not endpoint:
        logger.warning("ServerChan notification skipped: malformed SendKey")
        return False

    request = Request(
        endpoint,
        data=urlencode(message).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:
            result: Dict[str, Any] = json.loads(response.read().decode("utf-8"))
        if result.get("code") != 0:
            logger.warning("ServerChan notification rejected: code=%s", result.get("code"))
            return False
        return True
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        logger.warning("ServerChan notification failed: %s", exc)
        return False


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
    """Send a new-request notification to every configured administrator."""
    # Keep the signature aligned with the legacy notifier. Student IDs are
    # deliberately not included in third-party notification content.
    del student_id
    from app.config import get_settings

    settings = get_settings()
    sendkeys: Iterable[str] = settings.serverchan_sendkeys_list
    if not sendkeys:
        logger.info("ServerChan notification skipped: no SendKeys configured")
        return False

    message = build_borrow_notification_message(
        work_order_no=work_order_no,
        user_name=user_name,
        equipment_name=equipment_name,
        equipment_code=equipment_code,
        borrow_time=borrow_time,
        return_time=return_time,
        reason=reason,
        public_url=settings.SYSTEM_PUBLIC_URL,
        timezone_name=getattr(settings, "TZ", "Asia/Shanghai"),
    )
    success_count = sum(_send(sendkey, message) for sendkey in sendkeys)
    logger.info(
        "ServerChan notification complete for work order %s: %s/%s delivered",
        work_order_no,
        success_count,
        len(settings.serverchan_sendkeys_list),
    )
    return success_count > 0


def send_test_notification() -> bool:
    """Deliver a safe test message to configured administrators."""
    from app.config import get_settings

    sendkeys = get_settings().serverchan_sendkeys_list
    if not sendkeys:
        logger.info("ServerChan test skipped: no SendKeys configured")
        return False
    message = {
        "title": "FIELD NOTE｜微信通知测试",
        "desp": "如果你看到这条消息，FIELD NOTE 的微信审批提醒已经连通。",
    }
    return any(_send(sendkey, message) for sendkey in sendkeys)
