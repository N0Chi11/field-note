"""FastAPI 应用主入口。

职责：
- 创建 FastAPI 实例并配置 CORS
- 启动时自动创建数据库表
- 挂载业务路由（统一使用 /api/v1 前缀）
- 提供健康检查与 API 文档入口
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api import admin, auth, borrow, card, equipment, experience, logs
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.services.resource_state_service import reconcile_resource_states

logger = logging.getLogger(__name__)
settings = get_settings()

# 确保上传目录存在（StaticFiles 挂载需要目录已创建）
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时创建数据库表。

    使用 try-except 包裹，表已存在或创建失败时不阻断启动
    （生产环境推荐使用 Alembic 迁移管理表结构）。
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("数据库表已就绪")
    except Exception as e:
        logger.warning(f"数据库表创建失败（可能已存在或数据库未连接）: {e}")
    try:
        with SessionLocal() as db:
            changed = reconcile_resource_states(db)
        if changed:
            logger.info("已修复 %s 条设备或内存卡状态", changed)
    except Exception as e:
        logger.warning(f"资源状态校准失败: {e}")
    yield
    logger.info("应用关闭")


app = FastAPI(
    title="器材设备管理系统 API",
    description="Vue3 + FastAPI + MySQL 全栈器材设备借用系统后端",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件：上传的图片
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ===== 注册路由（统一 /api/v1 前缀）=====
api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(equipment.router, prefix=api_prefix)
app.include_router(card.router, prefix=api_prefix)
app.include_router(borrow.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(logs.router, prefix=api_prefix)
app.include_router(experience.router, prefix=api_prefix)


# ===== 根路径 & 健康检查 =====
@app.get("/", include_in_schema=False)
def root():
    """根路径重定向到 API 文档。"""
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["系统"], summary="健康检查")
def health_check():
    """健康检查端点，用于 Docker 健康检查和监控。"""
    return {"status": "healthy", "service": "equipment-api", "version": "1.0.0"}
