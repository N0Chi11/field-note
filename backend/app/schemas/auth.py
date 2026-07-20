"""认证相关 Schema。"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    """登录请求。"""

    student_id: str
    password: str


class TokenResponse(BaseModel):
    """登录成功后返回的令牌信息。"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """使用刷新令牌换取新的访问令牌。"""

    refresh_token: str


class UserResponse(BaseModel):
    """用户信息响应。"""

    id: int
    student_id: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PasswordChangeRequest(BaseModel):
    """修改密码请求。"""

    old_password: str
    new_password: str
