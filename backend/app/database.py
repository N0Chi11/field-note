"""数据库连接与 ORM 基类模块。

基于 SQLAlchemy 2.0 风格：
- 使用 DeclarativeBase 作为所有模型的基类
- engine 配置了 pool_recycle 与 pool_pre_ping 以适配 MySQL 连接特性
- get_db() 作为 FastAPI 依赖注入生成器
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# 创建数据库引擎
# pool_recycle: MySQL 默认 wait_timeout 为 8 小时，定期回收避免连接失效
# pool_pre_ping: 每次取连接前做一次 ping，防止使用已断开的连接
engine = create_engine(
    settings.DATABASE_URL,
    pool_recycle=3600,
    pool_pre_ping=True,
)

# 会话工厂
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """所有 ORM 模型的声明式基类。"""
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依赖注入：提供数据库会话，请求结束自动关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
