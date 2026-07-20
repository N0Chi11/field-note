"""冲突检测与工单号生成服务。

提供：
- 状态转换合法性校验（TRANSITIONS / validate_transition）
- 借用时间段冲突检测（hard / soft 两级，30 分钟缓冲）
- 工单号生成（WO + 日期 + 序号 + 随机字符）
"""

from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.borrow_request import BorrowRequest

# 状态转换规则
TRANSITIONS = {
    'pending': ['approved', 'rejected', 'cancelled'],
    'approved': ['borrowing', 'cancelled', 'rejected'],
    'borrowing': ['return_pending'],
    'return_pending': ['returned', 'borrowing'],
    'returned': [],
    'rejected': [],
    'cancelled': [],
}


def validate_transition(current_status, new_status):
    """检查状态转换是否合法。"""
    return new_status in TRANSITIONS.get(current_status, [])


def check_conflict(db: Session, equipment_id: int, borrow_time, return_time, exclude_request_id: int = None):
    """检测时间冲突。

    返回 dict: {has_conflict: bool, conflict_type: str|None, conflict_orders: list[str]}
    - hard: 完全包含或完全重叠
    - soft: 部分重叠（边界有 30 分钟缓冲则不算冲突）
    """
    query = db.query(BorrowRequest).filter(
        BorrowRequest.equipment_id == equipment_id,
        BorrowRequest.status.in_(['pending', 'approved', 'borrowing', 'return_pending']),
        BorrowRequest.borrow_time < return_time,
        BorrowRequest.return_time > borrow_time
    )
    if exclude_request_id:
        query = query.filter(BorrowRequest.id != exclude_request_id)
    conflicts = query.all()
    if not conflicts:
        return {"has_conflict": False, "conflict_type": None, "conflict_orders": []}
    # 判断 hard/soft: 30分钟缓冲
    buffer = timedelta(minutes=30)
    hard_conflicts = []
    soft_conflicts = []
    for c in conflicts:
        # 完全包含
        if c.borrow_time <= borrow_time and c.return_time >= return_time:
            hard_conflicts.append(c)
        elif c.borrow_time >= borrow_time and c.return_time <= return_time:
            hard_conflicts.append(c)
        elif c.borrow_time < borrow_time and (c.return_time - borrow_time) > buffer:
            hard_conflicts.append(c)
        elif c.return_time > return_time and (return_time - c.borrow_time) > buffer:
            hard_conflicts.append(c)
        else:
            soft_conflicts.append(c)
    if hard_conflicts:
        return {"has_conflict": True, "conflict_type": "hard", "conflict_orders": [c.work_order_no for c in hard_conflicts]}
    return {"has_conflict": True, "conflict_type": "soft", "conflict_orders": [c.work_order_no for c in soft_conflicts]}


def generate_work_order_no(db: Session) -> str:
    """生成工单号 WO + 日期 + 序号 + 随机字符。"""
    from datetime import datetime
    import random, string
    now = datetime.now()
    date_str = now.strftime('%Y%m%d')
    count = db.query(BorrowRequest).filter(BorrowRequest.work_order_no.like(f'WO{date_str}%')).count() + 1
    while True:
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=2))
        wo = f'WO{date_str}{str(count).zfill(3)}{random_suffix}'
        if not db.query(BorrowRequest).filter(BorrowRequest.work_order_no == wo).first():
            return wo
        count += 1
