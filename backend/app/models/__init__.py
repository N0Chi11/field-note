"""ORM 模型集合。

导入所有模型类，便于 Alembic 自动检测变更以及 ``Base.metadata.create_all``
自动建表。导入本包即完成所有模型的注册。
"""

from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.card import Card, CardStatus
from app.models.equipment import Equipment, EquipmentStatus
from app.models.equipment_favorite import EquipmentFavorite
from app.models.feedback import Feedback, FeedbackStatus, FeedbackType
from app.models.operation_log import OperationLog
from app.models.refresh_token import RefreshToken
from app.models.system_config import SystemConfig
from app.models.user import User, UserRole

__all__ = [
    "User",
    "UserRole",
    "Equipment",
    "EquipmentStatus",
    "EquipmentFavorite",
    "Feedback",
    "FeedbackStatus",
    "FeedbackType",
    "Card",
    "CardStatus",
    "BorrowRequest",
    "BorrowStatus",
    "OperationLog",
    "RefreshToken",
    "SystemConfig",
]
