"""Securely save user-uploaded images."""

from __future__ import annotations

import os
import uuid

from fastapi import HTTPException, UploadFile, status


MAX_IMAGE_SIZE = 10 * 1024 * 1024
_IMAGE_SIGNATURES = (
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"GIF87a", ".gif"),
    (b"GIF89a", ".gif"),
)


def _extension_from_header(header: bytes) -> str | None:
    for signature, extension in _IMAGE_SIGNATURES:
        if header.startswith(signature):
            return extension
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ".webp"
    return None


def save_image_upload(file: UploadFile, upload_dir: str) -> str:
    """Validate image bytes, enforce a limit, then atomically save the image."""
    temp_path: str | None = None
    try:
        header = file.file.read(16)
        extension = _extension_from_header(header)
        if not extension:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="仅支持 JPEG、PNG、GIF 或 WebP 图片",
            )

        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{extension}"
        final_path = os.path.join(upload_dir, filename)
        temp_path = f"{final_path}.uploading"
        size = len(header)
        with open(temp_path, "wb") as output:
            output.write(header)
            while chunk := file.file.read(64 * 1024):
                size += len(chunk)
                if size > MAX_IMAGE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="图片大小不能超过 10MB",
                    )
                output.write(chunk)

        os.replace(temp_path, final_path)
        temp_path = None
        return filename
    except HTTPException:
        raise
    except OSError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="图片保存失败",
        )
    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass
        file.file.close()
