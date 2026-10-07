"""Regression coverage for validation and physical equipment handover.

All records live in an isolated in-memory SQLite database, never production.
"""
from datetime import datetime, timedelta
from unittest import TestCase

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import BorrowRequest, BorrowStatus, Equipment, EquipmentStatus, User, UserRole
from app.api.admin import approve_request, confirm_pickup, confirm_return
from app.schemas.borrow import ApproveRequest, BorrowCreate, ConflictCheckRequest, PickupRequest, RejectRequest


class BorrowTimePolicyTests(TestCase):
    def test_same_shanghai_day_is_accepted_even_across_utc_dates(self):
        record = BorrowCreate(equipment_id=1, borrow_time="2026-10-07T17:00:00Z", return_time="2026-10-08T10:00:00Z", reason="拍摄")
        self.assertEqual(record.borrow_time, datetime(2026, 10, 7, 17))
        self.assertEqual(record.return_time, datetime(2026, 10, 8, 10))

    def test_crossing_shanghai_midnight_is_rejected_even_under_24_hours(self):
        for schema in (BorrowCreate, ConflictCheckRequest):
            with self.subTest(schema=schema.__name__), self.assertRaises(ValidationError) as context:
                schema(equipment_id=1, borrow_time="2026-10-08T15:30:00Z", return_time="2026-10-08T16:00:00Z", reason="拍摄")
            self.assertIn("设备不可过夜", str(context.exception))

    def test_offset_aware_same_day_times_are_stored_in_utc(self):
        record = BorrowCreate(equipment_id=1, borrow_time="2026-10-08T09:00:00+08:00", return_time="2026-10-08T18:00:00+08:00", reason="拍摄")
        self.assertEqual(record.borrow_time, datetime(2026, 10, 8, 1))
        self.assertEqual(record.return_time, datetime(2026, 10, 8, 10))

    def test_equal_or_reversed_times_are_rejected(self):
        for end in ("2026-10-08T09:00:00+08:00", "2026-10-08T08:00:00+08:00"):
            with self.subTest(end=end), self.assertRaises(ValidationError):
                BorrowCreate(equipment_id=1, borrow_time="2026-10-08T09:00:00+08:00", return_time=end, reason="拍摄")


class BorrowWorkflowTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.admin = User(student_id="admin-test", name="Test Admin", password_hash="unused", role=UserRole.admin)
        self.equipment = Equipment(code="TEST001", name="Test Camera", category="相机")
        self.db.add_all([self.admin, self.equipment])
        self.db.flush()
        self.record = BorrowRequest(
            work_order_no="WO-TEST", user_id=self.admin.id, equipment_id=self.equipment.id,
            borrow_time=datetime.utcnow() + timedelta(hours=1),
            return_time=datetime.utcnow() + timedelta(days=1), reason="Test", status=BorrowStatus.approved,
        )
        self.db.add(self.record)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_blank_reasons_and_rejections_are_rejected(self):
        with self.assertRaises(ValidationError):
            BorrowCreate(equipment_id=1, borrow_time=datetime.utcnow(), return_time=datetime.utcnow(), reason="  \n ")
        with self.assertRaises(ValidationError):
            RejectRequest(comment="  ")

    def test_maintenance_blocks_pickup_without_changing_record(self):
        self.equipment.status = EquipmentStatus.repair
        self.db.commit()
        with self.assertRaises(HTTPException) as context:
            confirm_pickup(self.record.id, PickupRequest(), self.db, self.admin)
        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(self.record.status, BorrowStatus.approved)

    def test_elapsed_reservation_cannot_be_approved_or_collected(self):
        self.record.return_time = datetime.utcnow() - timedelta(hours=1)
        self.record.status = BorrowStatus.pending
        self.db.commit()
        with self.assertRaises(HTTPException):
            approve_request(self.record.id, ApproveRequest(), self.db, self.admin)
        self.record.status = BorrowStatus.approved
        self.db.commit()
        with self.assertRaises(HTTPException):
            confirm_pickup(self.record.id, PickupRequest(), self.db, self.admin)

    def test_normal_handover_and_return_release_equipment(self):
        confirm_pickup(self.record.id, PickupRequest(), self.db, self.admin)
        self.assertEqual(self.record.status, BorrowStatus.borrowing)
        self.assertEqual(self.equipment.status, EquipmentStatus.borrowed)
        self.record.status = BorrowStatus.return_pending
        self.db.commit()
        confirm_return(self.record.id, self.db, self.admin)
        self.assertEqual(self.record.status, BorrowStatus.returned)
        self.assertEqual(self.equipment.status, EquipmentStatus.available)
        self.assertIsNotNone(self.record.actual_return)
