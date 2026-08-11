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

    # ===== WeCom notifications =====
    # Keep the webhook secret in the server .env file. Never commit a real URL.
    WECOM_BOT_WEBHOOK: str = ""
    WECOM_MENTIONED_MOBILES: str = ""
    SYSTEM_PUBLIC_URL: str = ""

    # ===== WxPusher notifications =====
    # Keep the real app token in the server .env file only.
    WXPUSHER_APP_TOKEN: str = ""
    WXPUSHER_TOPIC_IDS: str = ""
    WXPUSHER_UIDS: str = ""

    # ===== Timezone =====
    TZ: str = "Asia/Shanghai"

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

    @property
    def wecom_mentioned_mobiles_list(self) -> List[str]:
        """Return admin mobile numbers used for WeCom @mentions."""
        if not self.WECOM_MENTIONED_MOBILES:
            return []
        return [
            mobile.strip()
            for mobile in self.WECOM_MENTIONED_MOBILES.split(",")
            if mobile.strip()
        ]

    @property
    def wxpusher_topic_ids_list(self) -> List[int]:
        """Return valid positive Topic IDs from a comma-separated value."""
        if not self.WXPUSHER_TOPIC_IDS:
            return []
        return [
            int(value.strip())
            for value in self.WXPUSHER_TOPIC_IDS.split(",")
            if value.strip().isdigit() and int(value.strip()) > 0
        ]

    @property
    def wxpusher_uids_list(self) -> List[str]:
        """Return WxPusher UIDs used for direct test notifications."""
        if not self.WXPUSHER_UIDS:
            return []
        return [
            uid.strip()
            for uid in self.WXPUSHER_UIDS.split(",")
            if uid.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """获取配置单例（带 lru_cache 缓存）。"""
    return Settings()
