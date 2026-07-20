"""通用响应模型。

提供统一 API 响应结构与分页响应结构，使用 Pydantic v2 泛型支持任意数据类型。
"""

from __future__ import annotations

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应结构。

    - code: 业务状态码，0 表示成功，非 0 表示业务错误
    - data: 业务数据
    - message: 提示信息
    """

    code: int = 0
    data: Optional[T] = None
    message: str = "ok"

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应结构。"""

    items: List[T]
    total: int
    page: int
    size: int

    model_config = ConfigDict(from_attributes=True)
