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

# 活跃状态（参与冲突检测的状态）
ACTIVE_STATUSES = ['pending', 'approved', 'borrowing', 'return_pending']

# 30分钟缓冲
CONFLICT_BUFFER = timedelta(minutes=30)


def validate_transition(current_status, new_status):
    """检查状态转换是否合法。"""
    return new_status in TRANSITIONS.get(current_status, [])


def check_conflict(db: Session, equipment_id: int, borrow_time, return_time, exclude_request_id: int = None):
    """检测时间冲突。

    严格按照原 HTML 逻辑：
    1. 找到所有时间重叠的活跃借用记录（加 30 分钟缓冲）
    2. 按状态分类：
       - hard: 冲突记录状态为 approved 或 borrowing
       - soft: 冲突记录状态为 pending 或 return_pending
    3. 有 hard 冲突时返回 hard，否则有 soft 冲突返回 soft
    """
    # 加 30 分钟缓冲后的时间范围
    buffered_start = borrow_time - CONFLICT_BUFFER
    buffered_end = return_time + CONFLICT_BUFFER

    query = db.query(BorrowRequest).filter(
        BorrowRequest.equipment_id == equipment_id,
        BorrowRequest.status.in_(ACTIVE_STATUSES),
        # 时间重叠判断：buffered_start < r.return_time AND buffered_end > r.borrow_time
        BorrowRequest.return_time > buffered_start,
        BorrowRequest.borrow_time < buffered_end,
    )
    if exclude_request_id:
        query = query.filter(BorrowRequest.id != exclude_request_id)
    conflicts = query.all()

    if not conflicts:
        return {"has_conflict": False, "conflict_type": None, "conflict_orders": []}

    # 按状态分类（与原 HTML 一致）
    hard_conflicts = [c for c in conflicts if c.status in ('approved', 'borrowing')]
    soft_conflicts = [c for c in conflicts if c.status in ('pending', 'return_pending')]

    if hard_conflicts:
        return {
            "has_conflict": True,
            "conflict_type": "hard",
            "conflict_orders": [c.work_order_no for c in hard_conflicts],
        }
    return {
        "has_conflict": True,
        "conflict_type": "soft",
        "conflict_orders": [c.work_order_no for c in soft_conflicts],
    }


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
