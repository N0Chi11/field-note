"""设备收藏可用状态辅助函数。"""

from sqlalchemy.orm import Session

from app.models.equipment_favorite import EquipmentFavorite


def mark_favorites_unavailable(db: Session, equipment_id: int) -> int:
    """设备被领取或进入维修时，为下一次恢复可借提醒做好标记。"""
    return db.query(EquipmentFavorite).filter(
        EquipmentFavorite.equipment_id == equipment_id,
        EquipmentFavorite.last_known_available.is_(True),
    ).update(
        {EquipmentFavorite.last_known_available: False},
        synchronize_session=False,
    )
