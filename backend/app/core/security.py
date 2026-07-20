"""安全工具模块：密码哈希、JWT 令牌生成与校验、Token 哈希。"""
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

# bcrypt 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码与哈希是否匹配，无效哈希返回 False。"""
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """使用 bcrypt 对密码进行哈希。"""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """
    创建 JWT access token。

    data 应包含 sub(user_id)、role；函数内部追加 exp 与 type="access"。
    过期时间取自 settings.ACCESS_TOKEN_EXPIRE_MINUTES。
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    创建 JWT refresh token。

    data 应包含 sub(user_id)；函数内部追加 exp 与 type="refresh"。
    过期时间取自 settings.REFRESH_TOKEN_EXPIRE_DAYS。
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """解码 JWT，返回 payload dict；签名无效或已过期时返回 None。"""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def hash_token(token: str) -> str:
    """对 token 做 SHA256 哈希，用于持久化存储（refresh_tokens.token_hash）。"""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
