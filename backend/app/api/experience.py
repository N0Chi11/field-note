"""预约日历、个人年鉴和设备收藏接口。"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.borrow_request import BorrowRequest, BorrowStatus
from app.models.equipment import Equipment, EquipmentStatus
from app.models.equipment_favorite import EquipmentFavorite
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(tags=["体验功能"])

ACTIVE_STATUSES = [
    BorrowStatus.pending,
    BorrowStatus.approved,
    BorrowStatus.borrowing,
    BorrowStatus.return_pending,
]


def _status_value(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _is_available(equipment: Equipment) -> bool:
    return _status_value(equipment.status) == EquipmentStatus.available.value


def _utc_naive(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _favorite_payload(favorite: EquipmentFavorite, equipment: Equipment) -> dict:
    return {
        "id": favorite.id,
        "equipment_id": equipment.id,
        "equipment_code": equipment.code,
        "equipment_name": equipment.name,
        "equipment_category": equipment.category,
        "image_url": equipment.image_url,
        "status": _status_value(equipment.status),
        "is_available": _is_available(equipment),
        "created_at": favorite.created_at,
    }


@router.get("/favorites", response_model=ApiResponse)
def list_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(EquipmentFavorite, Equipment)
        .join(Equipment, Equipment.id == EquipmentFavorite.equipment_id)
        .filter(EquipmentFavorite.user_id == current_user.id)
        .order_by(EquipmentFavorite.created_at.desc())
        .all()
    )
    return ApiResponse(data=[_favorite_payload(f, e) for f, e in rows], message="ok")


@router.post("/favorites/{equipment_id}", response_model=ApiResponse)
def add_favorite(
    equipment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if equipment is None:
        raise HTTPException(status_code=404, detail="设备不存在")

    favorite = db.query(EquipmentFavorite).filter(
        EquipmentFavorite.user_id == current_user.id,
        EquipmentFavorite.equipment_id == equipment_id,
    ).first()
    if favorite is None:
        favorite = EquipmentFavorite(
            user_id=current_user.id,
            equipment_id=equipment_id,
            last_known_available=_is_available(equipment),
        )
        db.add(favorite)
        db.commit()
        db.refresh(favorite)
    return ApiResponse(data=_favorite_payload(favorite, equipment), message="已收藏")


@router.delete("/favorites/{equipment_id}", response_model=ApiResponse)
def remove_favorite(
    equipment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorite = db.query(EquipmentFavorite).filter(
        EquipmentFavorite.user_id == current_user.id,
        EquipmentFavorite.equipment_id == equipment_id,
    ).first()
    if favorite is not None:
        db.delete(favorite)
        db.commit()
    return ApiResponse(message="已取消收藏")


@router.get("/favorites/availability-notifications", response_model=ApiResponse)
def favorite_availability_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """返回从不可借恢复为可借的收藏设备，并消费这次状态变化。"""
    rows = (
        db.query(EquipmentFavorite, Equipment)
        .join(Equipment, Equipment.id == EquipmentFavorite.equipment_id)
        .filter(EquipmentFavorite.user_id == current_user.id)
        .all()
    )
    notices = []
    changed = False
    for favorite, equipment in rows:
        available = _is_available(equipment)
        if available and not favorite.last_known_available:
            notices.append(_favorite_payload(favorite, equipment))
            favorite.last_known_available = True
            changed = True
        elif not available and favorite.last_known_available:
            favorite.last_known_available = False
            changed = True
    if changed:
        db.commit()
    return ApiResponse(data=notices, message="ok")


@router.get("/calendar", response_model=ApiResponse)
def reservation_calendar(
    start: datetime = Query(..., description="UTC ISO 开始时间"),
    end: datetime = Query(..., description="UTC ISO 结束时间"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """返回指定区间的全局占用记录；普通用户看不到他人的身份与用途。"""
    start_utc, end_utc = _utc_naive(start), _utc_naive(end)
    if end_utc <= start_utc:
        raise HTTPException(status_code=400, detail="结束时间必须晚于开始时间")
    if (end_utc - start_utc).days > 370:
        raise HTTPException(status_code=400, detail="单次最多查询 370 天")

    records = (
        db.query(BorrowRequest)
        .options(joinedload(BorrowRequest.equipment), joinedload(BorrowRequest.user))
        .filter(
            BorrowRequest.status.in_(ACTIVE_STATUSES),
            BorrowRequest.borrow_time < end_utc,
            BorrowRequest.return_time > start_utc,
        )
        .order_by(BorrowRequest.borrow_time.asc())
        .all()
    )
    items = []
    for record in records:
        is_mine = record.user_id == current_user.id
        can_view_identity = current_user.role == "admin" or is_mine
        items.append({
            "id": record.id,
            "work_order_no": record.work_order_no if can_view_identity else "",
            "equipment_id": record.equipment_id,
            "equipment_code": record.equipment.code if record.equipment else "",
            "equipment_name": record.equipment.name if record.equipment else "",
            "equipment_category": record.equipment.category if record.equipment else "",
            "borrow_time": record.borrow_time,
            "return_time": record.return_time,
            "status": _status_value(record.status),
            "is_mine": is_mine,
            "user_name": record.user.name if can_view_identity and record.user else "已预约",
            "reason": record.reason if can_view_identity else "该时段已被预约",
        })
    return ApiResponse(data=items, message="ok")


@router.get("/yearbook", response_model=ApiResponse)
def personal_yearbook(
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """聚合当前用户某一年的借用年鉴数据。"""
    selected_year = year or datetime.now().year
    base_query = db.query(BorrowRequest).filter(BorrowRequest.user_id == current_user.id)
    available_year_rows = (
        base_query.with_entities(extract("year", BorrowRequest.created_at).label("year"))
        .distinct()
        .order_by(extract("year", BorrowRequest.created_at).desc())
        .all()
    )
    available_years = [int(row.year) for row in available_year_rows if row.year]
    if selected_year not in available_years:
        available_years.insert(0, selected_year)

    records = (
        base_query.options(joinedload(BorrowRequest.equipment))
        .filter(extract("year", BorrowRequest.created_at) == selected_year)
        .order_by(BorrowRequest.created_at.desc())
        .all()
    )
    valid = [r for r in records if _status_value(r.status) not in ("rejected", "cancelled")]
    returned = [r for r in valid if _status_value(r.status) == "returned"]

    equipment_counts: dict[int, dict] = {}
    category_counts: dict[str, int] = {}
    total_hours = 0.0
    on_time_count = 0
    for record in valid:
        equipment = record.equipment
        if equipment:
            entry = equipment_counts.setdefault(equipment.id, {
                "equipment_id": equipment.id,
                "name": equipment.name,
                "code": equipment.code,
                "count": 0,
            })
            entry["count"] += 1
            category_counts[equipment.category] = category_counts.get(equipment.category, 0) + 1
        end_time = record.actual_return or record.return_time
        total_hours += max(0.0, (end_time - record.borrow_time).total_seconds() / 3600)
        if _status_value(record.status) == "returned" and record.actual_return:
            if record.actual_return <= record.return_time:
                on_time_count += 1

    top_equipment = sorted(
        equipment_counts.values(), key=lambda item: (-item["count"], item["name"])
    )[:5]
    categories = [
        {"name": name, "count": count}
        for name, count in sorted(category_counts.items(), key=lambda item: -item[1])
    ]
    recent_projects = [
        {
            "work_order_no": record.work_order_no,
            "equipment_name": record.equipment.name if record.equipment else "",
            "reason": record.reason,
            "borrow_time": record.borrow_time,
            "status": _status_value(record.status),
        }
        for record in valid[:5]
    ]
    data = {
        "year": selected_year,
        "available_years": available_years,
        "user_name": current_user.name,
        "student_id": current_user.student_id,
        "total_requests": len(records),
        "successful_borrows": len(valid),
        "returned_count": len(returned),
        "on_time_rate": round(on_time_count / len(returned) * 100) if returned else 100,
        "total_hours": round(total_hours, 1),
        "top_equipment": top_equipment,
        "categories": categories,
        "recent_projects": recent_projects,
    }
    return ApiResponse(data=data, message="ok")


@router.get("/passport", response_model=ApiResponse)
def creative_passport(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """根据当前用户的历史记录，实时计算创作护照与成就印章。"""
    records = (
        db.query(BorrowRequest)
        .options(joinedload(BorrowRequest.equipment))
        .filter(BorrowRequest.user_id == current_user.id)
        .order_by(BorrowRequest.created_at.asc())
        .all()
    )
    valid = [
        r
        for r in records
        if _status_value(r.status) in ("approved", "borrowing", "return_pending", "returned")
    ]
    started = [
        r
        for r in valid
        if _status_value(r.status) in ("borrowing", "return_pending", "returned")
    ]
    returned = [r for r in started if _status_value(r.status) == "returned"]
    equipment_ids = {r.equipment_id for r in started}
    categories = {
        r.equipment.category
        for r in started
        if r.equipment and r.equipment.category
    }
    total_hours = sum(
        max(0.0, ((r.actual_return or r.return_time) - r.borrow_time).total_seconds() / 3600)
        for r in started
    )
    on_time_returns = sum(
        1
        for r in returned
        if r.actual_return is not None and r.actual_return <= r.return_time
    )
    night_projects = sum(
        1
        for r in started
        if (r.borrow_time + timedelta(hours=8)).hour >= 18
        or (r.borrow_time + timedelta(hours=8)).hour < 6
    )
    audio_projects = sum(
        1
        for r in started
        if r.equipment and r.equipment.category in ("麦克风", "录音设备")
    )
    support_projects = sum(
        1
        for r in started
        if r.equipment and r.equipment.category in ("稳定器", "三脚架")
    )

    def stamp(
        key: str,
        title: str,
        description: str,
        current: float,
        target: float,
        icon: str,
    ) -> dict:
        return {
            "key": key,
            "title": title,
            "description": description,
            "current": round(current, 1),
            "target": target,
            "earned": current >= target,
            "icon": icon,
        }

    stamps = [
        stamp("first-frame", "第一格胶片", "完成第一次设备领取", len(started), 1, "camera"),
        stamp("three-tools", "器材漫游者", "使用三台不同的设备", len(equipment_ids), 3, "equipment"),
        stamp("ten-returns", "可靠的归档人", "完成十次设备归还", len(returned), 10, "return"),
        stamp("night-editor", "夜间编辑部", "完成一次夜间创作", night_projects, 1, "light"),
        stamp("sound-hunter", "声音采集者", "使用一次录音设备", audio_projects, 1, "microphone"),
        stamp("steady-hand", "稳定构图", "使用一次稳定器或三脚架", support_projects, 1, "tripod"),
        stamp("punctual", "准时抵达", "累计三次按时归还", on_time_returns, 3, "approved"),
        stamp("hundred-hours", "一百小时计划", "累计创作时长达到一百小时", total_hours, 100, "pending"),
    ]
    data = {
        "user_name": current_user.name,
        "student_id": current_user.student_id,
        "member_since": current_user.created_at,
        "total_projects": len(valid),
        "completed_returns": len(returned),
        "unique_equipment": len(equipment_ids),
        "total_hours": round(total_hours, 1),
        "categories": sorted(categories),
        "earned_stamps": sum(1 for item in stamps if item["earned"]),
        "stamps": stamps,
    }
    return ApiResponse(data=data, message="ok")
