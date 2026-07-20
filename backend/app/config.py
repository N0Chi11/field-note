"""应用配置模块。

使用 pydantic-settings 从环境变量 / .env 文件读取配置，
并通过 lru_cache 提供单例式的 get_settings() 访问入口。
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """全局配置项，字段名与环境变量名一致（大写）。"""

    # ===== Database =====
    DATABASE_URL: str = (
        "mysql+pymysql://equip_app:yourpassword@localhost:3306/equipment_db"
    )

    # ===== Redis =====
    REDIS_URL: str = "redis://localhost:6379/0"

    # ===== JWT =====
    JWT_SECRET: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ===== CORS =====
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost"

    # ===== Upload =====
    UPLOAD_DIR: str = "/app/uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """将逗号分隔的 CORS_ORIGINS 字符串解析为列表。"""
        if not self.CORS_ORIGINS:
            return []
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """获取配置单例（带 lru_cache 缓存）。"""
    return Settings()
