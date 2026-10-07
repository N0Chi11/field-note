"""Send one safe ServerChan connectivity test from the deployed backend."""

from app.services.serverchan_notification_service import send_test_notification


if __name__ == "__main__":
    if send_test_notification():
        print("所有接收人的测试请求已被 Server酱接受，请逐一检查微信实际收信情况。")
    else:
        print("至少一位接收人的测试未成功，请检查 SERVERCHAN_SENDKEYS 和后端日志。")
        raise SystemExit(1)
