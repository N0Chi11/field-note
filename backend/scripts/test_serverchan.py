"""Send one safe ServerChan connectivity test from the deployed backend."""

from app.services.serverchan_notification_service import send_test_notification


if __name__ == "__main__":
    if send_test_notification():
        print("ServerChan test message sent; please check WeChat service notifications.")
    else:
        print("ServerChan test was not delivered; check SERVERCHAN_SENDKEYS and backend logs.")
