from datetime import datetime
from unittest import TestCase

from app.services.wxpusher_notification_service import build_wxpusher_payload


class WxPusherNotificationTests(TestCase):
    def test_payload_contains_targets_and_request_details(self):
        payload = build_wxpusher_payload(
            app_token="AT_test",
            work_order_no="REQ-001",
            user_name="张三",
            student_id="20260001",
            equipment_name="Sony A7M4",
            equipment_code="CAM-001",
            borrow_time=datetime(2026, 8, 10, 1, 0),
            return_time=datetime(2026, 8, 10, 10, 0),
            reason="校园活动拍摄",
            topic_ids=[123],
            uids=["UID_test"],
            public_url="https://equipment.example.com/",
            timezone_name="Asia/Shanghai",
        )

        self.assertEqual(payload["contentType"], 2)
        self.assertEqual(payload["topicIds"], [123])
        self.assertEqual(payload["uids"], ["UID_test"])
        self.assertEqual(payload["url"], "https://equipment.example.com")
        self.assertIn("REQ-001", payload["content"])
        self.assertIn("Sony A7M4", payload["content"])
        self.assertIn("2026-08-10 09:00", payload["content"])

    def test_user_content_is_html_escaped(self):
        payload = build_wxpusher_payload(
            app_token="AT_test",
            work_order_no="REQ-002",
            user_name="<script>alert(1)</script>",
            student_id="1",
            equipment_name="相机",
            equipment_code="CAM-002",
            borrow_time=datetime(2026, 8, 10, 1, 0),
            return_time=datetime(2026, 8, 10, 2, 0),
            reason="<b>测试</b>",
            uids=["UID_test"],
        )

        self.assertNotIn("<script>", payload["content"])
        self.assertIn("&lt;script&gt;", payload["content"])
        self.assertIn("&lt;b&gt;测试&lt;/b&gt;", payload["content"])


if __name__ == "__main__":
    import unittest

    unittest.main()
