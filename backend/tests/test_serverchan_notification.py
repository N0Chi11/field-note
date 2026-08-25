from datetime import datetime
from unittest import TestCase
from urllib.parse import parse_qs

from app.services.serverchan_notification_service import (
    build_borrow_notification_message,
    serverchan_endpoint,
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
