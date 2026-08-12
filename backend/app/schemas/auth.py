"""认证相关 Schema。"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    """登录请求 — 支持用户登录和管理员登录两种模式。

    用户登录：login_type="user", name=姓名, student_id=学号
    管理员登录：login_type="admin", name=管理员姓名, password=密码
    """

    login_type: str = "user"  # "user" 或 "admin"
    name: Optional[str] = None        # 用户姓名 或 管理员姓名
    student_id: Optional[str] = None  # 用户学号
    password: Optional[str] = None    # 管理员密码


class TokenResponse(BaseModel):
    """登录成功后返回的令牌信息。"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None


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


class DefaultAvatarRequest(BaseModel):
    """选择系统内置的画报头像。"""

    avatar_key: str
