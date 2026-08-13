"""用户反馈接口 Schema。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    feedback_type: Literal["bug", "suggestion", "other"] = "suggestion"
    content: str = Field(min_length=5, max_length=2000)
    contact: str | None = Field(default=None, max_length=100)


class FeedbackUpdate(BaseModel):
    status: Literal["open", "reviewed", "resolved"]
    admin_note: str | None = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    id: int
    feedback_type: str
    content: str
    contact: str | None = None
    status: str
    admin_note: str | None = None
    user_name: str
    user_student_id: str
    handler_name: str | None = None
    handled_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
