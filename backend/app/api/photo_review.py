"""Short-lived, admin-only browser sessions for the photo-review workspace."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt

from app.config import get_settings
from app.core.deps import get_current_admin
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/admin/photo-review", tags=["照片审核"])
settings = get_settings()
SESSION_COOKIE = "photo_review_session"
SESSION_AUDIENCE = "field-note-photo-review"
SESSION_TTL_SECONDS = 15 * 60


def _secure_cookie(request: Request) -> bool:
    forwarded = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    return (forwarded or request.url.scheme).lower() == "https"


@router.post("/session", response_model=ApiResponse[dict])
def create_photo_review_session(
    request: Request,
    response: Response,
    current_admin: User = Depends(get_current_admin),
):
    """Issue a narrowly scoped cookie; the regular bearer token stays out of URLs."""
    if len(settings.PHOTO_REVIEW_SESSION_SECRET) < 32 or settings.PHOTO_REVIEW_SESSION_SECRET.startswith("REPLACE_WITH_"):
        raise HTTPException(status_code=503, detail="照片审核尚未完成密钥配置")
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": str(current_admin.id),
            "role": "admin",
            "type": "photo_review_session",
            "aud": SESSION_AUDIENCE,
            "iat": now,
            "exp": now + timedelta(seconds=SESSION_TTL_SECONDS),
        },
        settings.PHOTO_REVIEW_SESSION_SECRET,
        algorithm="HS256",
    )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        path="/photo-review",
        httponly=True,
        secure=_secure_cookie(request),
        samesite="strict",
    )
    return ApiResponse(data={"expires_in": SESSION_TTL_SECONDS}, message="已授权")


@router.delete("/session", response_model=ApiResponse[dict])
def clear_photo_review_session(
    request: Request,
    response: Response,
    _current_admin: User = Depends(get_current_admin),
):
    """Clear the photo-review cookie before the administrator signs out."""
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/photo-review",
        httponly=True,
        secure=_secure_cookie(request),
        samesite="strict",
    )
    return ApiResponse(data={}, message="已退出照片审核")
