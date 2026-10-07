from datetime import datetime
from unittest import TestCase
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import HTTPError

from app.services.serverchan_notification_service import (
    build_borrow_notification_message,
    serverchan_endpoint,
    send_test_notification,
    _send,
)


class ServerChanNotificationTests(TestCase):
    def test_selects_endpoint_for_turbo_and_serverchan3(self):
        self.assertEqual(
            serverchan_endpoint("SCTabcdefgh123456"),
            "https://sctapi.ftqq.com/SCTabcdefgh123456.send",
        )
        self.assertEqual(
            serverchan_endpoint("sctp12345tabcdefgh"),
            "https://12345.push.ft07.com/send/sctp12345tabcdefgh.send",
        )
        self.assertIsNone(serverchan_endpoint("not a valid key"))
        self.assertIsNone(serverchan_endpoint("sctpbrokenkey"))
        self.assertIsNone(serverchan_endpoint("unexpectedkey"))

    def test_test_notification_attempts_all_recipients_even_after_success(self):
        keys = ["SCTrecipient1", "SCTrecipient2", "SCTrecipient3", "SCTrecipient4"]
        settings = SimpleNamespace(serverchan_sendkeys_list=keys)
        with patch("app.config.get_settings", return_value=settings), patch(
            "app.services.serverchan_notification_service._send",
            side_effect=[True, False, True, True],
        ) as send:
            self.assertFalse(send_test_notification())
            self.assertEqual([call.args[0] for call in send.call_args_list], keys)

    def test_error_logs_do_not_expose_sendkey(self):
        key = "SCTsecretMustNotAppear"
        error = HTTPError(serverchan_endpoint(key), 503, "unavailable", {}, None)
        with patch("app.services.serverchan_notification_service.urlopen", side_effect=error):
            with self.assertLogs("app.services.serverchan_notification_service", level="WARNING") as logs:
                self.assertFalse(_send(key, {"title": "Test", "desp": "Test"}))
        self.assertNotIn(key, "\n".join(logs.output))

    def test_message_is_markdown_and_omits_student_id(self):
        message = build_borrow_notification_message(
            work_order_no="REQ-001",
            user_name="张三",
            equipment_name="Sony A7M4",
            equipment_code="CAM-001",
            borrow_time=datetime(2026, 8, 10, 1, 0),
            return_time=datetime(2026, 8, 10, 10, 0),
            reason="校园活动拍摄",
            public_url="https://equipment.example.com/",
            timezone_name="Asia/Shanghai",
        )

        self.assertEqual(message["title"], "FIELD NOTE｜新的借用申请")
        self.assertIn("REQ-001", message["desp"])
        self.assertIn("2026-08-10 09:00", message["desp"])
        self.assertIn("[进入系统审批](https://equipment.example.com)", message["desp"])
        self.assertNotIn("学号", message["desp"])


if __name__ == "__main__":
    import unittest

    unittest.main()
