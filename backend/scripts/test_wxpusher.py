"""Send one WxPusher test notification using the current server settings."""

from datetime import datetime, timedelta, timezone

from app.services.wxpusher_notification_service import notify_borrow_request_via_wxpusher


if __name__ == "__main__":
    now = datetime.now(timezone.utc)
    success = notify_borrow_request_via_wxpusher(
        work_order_no="WXPUSHER-CONNECTION-TEST",
        user_name="系统测试",
        student_id="TEST",
        equipment_name="测试设备",
        equipment_code="TEST-001",
        borrow_time=now,
        return_time=now + timedelta(hours=1),
        reason="WxPusher 微信提醒连接测试",
    )
    if not success:
        raise SystemExit("发送失败，请运行 docker compose logs backend 查看原因")
    print("发送任务创建成功，请检查 WxPusher 消息")
