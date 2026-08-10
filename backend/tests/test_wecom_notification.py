from datetime import datetime
from unittest import TestCase

from app.services.wecom_notification_service import (
    _valid_wecom_webhook,
    build_borrow_notification_payload,
)


class WeComNotificationTests(TestCase):
    def test_only_official_webhook_is_accepted(self):
        self.assertTrue(
            _valid_wecom_webhook(
                "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key"
            )
        )
        self.assertFalse(_valid_wecom_webhook("https://example.com/?key=test-key"))
        self.assertFalse(
            _valid_wecom_webhook(
                "http://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key"
            )
        )

    def test_payload_contains_request_details_and_mentions(self):
        payload = build_borrow_notification_payload(
            work_order_no="REQ-001",
            user_name="张三",
            student_id="20260001",
            equipment_name="Sony A7M4",
            equipment_code="CAM-001",
            borrow_time=datetime(2026, 8, 10, 1, 0),
            return_time=datetime(2026, 8, 10, 10, 0),
            reason="校园活动拍摄",
            mentioned_mobiles=["13800000001", "13800000002"],
            public_url="https://equipment.example.com/",
            timezone_name="Asia/Shanghai",
        )

        self.assertEqual(payload["msgtype"], "text")
        content = payload["text"]["content"]
        self.assertIn("REQ-001", content)
        self.assertIn("Sony A7M4（CAM-001）", content)
        self.assertIn("2026-08-10 09:00", content)
        self.assertIn("https://equipment.example.com", content)
        self.assertEqual(
            payload["text"]["mentioned_mobile_list"],
            ["13800000001", "13800000002"],
        )


if __name__ == "__main__":
    import unittest

    unittest.main()
