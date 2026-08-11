"""Keep equipment and memory-card availability aligned with active borrow records."""

from sqlalchemy.orm import Session

from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.card import Card, CardStatus
from app.models.equipment import Equipment, EquipmentStatus
from app.services.favorite_service import mark_favorites_unavailable


PHYSICAL_HOLD_STATUSES = (BorrowStatus.borrowing, BorrowStatus.return_pending)


def reconcile_resource_states(db: Session) -> int:
    """Repair stale availability flags left by previous versions or interrupted actions."""
    equipment_ids = {
        resource_id
        for (resource_id,) in (
            db.query(BorrowRequest.equipment_id)
            .filter(BorrowRequest.status.in_(PHYSICAL_HOLD_STATUSES))
            .distinct()
            .all()
        )
    }
    card_ids = {
        resource_id
        for (resource_id,) in (
            db.query(BorrowRequest.card_id)
            .filter(
                BorrowRequest.status.in_(PHYSICAL_HOLD_STATUSES),
                BorrowRequest.card_id.is_not(None),
            )
            .distinct()
            .all()
        )
    }

    changed = 0
    for equipment in db.query(Equipment).all():
        # A repair flag is an explicit administrator decision and must not be overwritten.
        if equipment.status == EquipmentStatus.repair:
            changed += mark_favorites_unavailable(db, equipment.id)
            continue
        desired = (
            EquipmentStatus.borrowed
            if equipment.id in equipment_ids
            else EquipmentStatus.available
        )
        if equipment.status != desired:
            equipment.status = desired
            changed += 1
        if desired == EquipmentStatus.borrowed:
            changed += mark_favorites_unavailable(db, equipment.id)

    for card in db.query(Card).all():
        desired = CardStatus.borrowed if card.id in card_ids else CardStatus.available
        if card.status != desired:
            card.status = desired
            changed += 1

    if changed:
        db.commit()
    return changed
