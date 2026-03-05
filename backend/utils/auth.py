from __future__ import annotations

from fastapi import Request, HTTPException
from backend.config import get_settings


async def check_auth(request: Request):
    settings = get_settings()
    if not settings.auth.enabled:
        return
    auth = request.headers.get("authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if token != settings.auth.token:
        raise HTTPException(status_code=403, detail="Unauthorized")
