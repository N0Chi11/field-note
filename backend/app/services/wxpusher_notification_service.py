"""Best-effort borrow notifications through the WxPusher API."""

from __future__ import annotations

import html
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

logger = logging.getLogger(__name__)

_SEND_URL = "https://wxpusher.zjiecode.com/api/send/message"


def _compact(value: str, limit: int) -> str:
    text = " ".join(str(value).split())
    return text if len(text) <= limit else f"{text[: limit - 1]}…"


def _format_time(value: datetime, timezone_name: str) -> str:
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


def build_wxpusher_payload(
    *,
    app_token: str,
    work_order_no: str,
    user_name: str,
    student_id: str,
    equipment_name: str,
    equipment_code: str,
    borrow_time: datetime,
    return_time: datetime,
    reason: str,
    topic_ids: Iterable[int] = (),
    uids: Iterable[str] = (),
    public_url: str = "",
    timezone_name: str = "Asia/Shanghai",
) -> Dict[str, Any]:
    """Build an escaped HTML notification for direct users and/or a Topic."""
    safe_order = html.escape(_compact(work_order_no, 80))
    safe_user = html.escape(_compact(user_name, 50))
    safe_student_id = html.escape(_compact(student_id, 30))
    safe_equipment = html.escape(_compact(equipment_name, 100))
    safe_code = html.escape(_compact(equipment_code, 30))
    safe_reason = html.escape(_compact(reason, 500))
    borrow_text = _format_time(borrow_time, timezone_name)
    return_text = _format_time(return_time, timezone_name)
    content = (
        "<h2>新的设备借用申请</h2>"
        f"<p><b>工单号：</b>{safe_order}</p>"
        f"<p><b>申请人：</b>{safe_user}（{safe_student_id}）</p>"
        f"<p><b>设备：</b>{safe_equipment}（{safe_code}）</p>"
        f"<p><b>借用时间：</b>{borrow_text}</p>"
        f"<p><b>归还时间：</b>{return_text}</p>"
        f"<p><b>用途：</b>{safe_reason}</p>"
        "<p>请管理员及时进入系统审批。</p>"
    )
    payload: Dict[str, Any] = {
        "appToken": app_token.strip(),
        "summary": _compact(f"新借用申请｜{equipment_name}", 100),
        "content": content,
        "contentType": 2,
        "topicIds": [int(topic_id) for topic_id in topic_ids if int(topic_id) > 0],
        "uids": [uid.strip() for uid in uids if uid.strip()],
    }
    if public_url.strip():
        payload["url"] = public_url.strip().rstrip("/")
    return payload


def notify_borrow_request_via_wxpusher(
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
    """Send one notification; failures never affect the saved borrow request."""
    from app.config import get_settings

    settings = get_settings()
    app_token = settings.WXPUSHER_APP_TOKEN.strip()
    topic_ids = settings.wxpusher_topic_ids_list
    uids = settings.wxpusher_uids_list
    if not app_token:
        logger.info("WxPusher notification skipped: app token is not configured")
        return False
    if not app_token.startswith("AT_"):
        logger.error("WxPusher notification skipped: invalid app token format")
        return False
    if not topic_ids and not uids:
        logger.info("WxPusher notification skipped: no Topic ID or UID configured")
        return False

    payload = build_wxpusher_payload(
        app_token=app_token,
        work_order_no=work_order_no,
        user_name=user_name,
        student_id=student_id,
        equipment_name=equipment_name,
        equipment_code=equipment_code,
        borrow_time=borrow_time,
        return_time=return_time,
        reason=reason,
        topic_ids=topic_ids,
        uids=uids,
        public_url=settings.SYSTEM_PUBLIC_URL,
        timezone_name=getattr(settings, "TZ", "Asia/Shanghai"),
    )
    request = Request(
        _SEND_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=8) as response:
            result = json.loads(response.read().decode("utf-8"))
        if result.get("code") != 1000:
            logger.warning(
                "WxPusher rejected work order %s: code=%s msg=%s",
                work_order_no,
                result.get("code"),
                result.get("msg"),
            )
            return False
        logger.info("WxPusher notification queued for work order %s", work_order_no)
        return True
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        logger.warning(
            "WxPusher notification failed for work order %s: %s",
            work_order_no,
            exc,
        )
        return False
