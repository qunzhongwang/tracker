from __future__ import annotations

from fastapi import Depends, HTTPException, Header
from backend.config import get_settings, Settings
from backend.database import get_db
import aiosqlite


async def get_current_settings() -> Settings:
    return get_settings()


async def get_database() -> aiosqlite.Connection:
    return await get_db()


async def verify_auth(
    authorization: str | None = Header(None),
    settings: Settings = Depends(get_current_settings),
):
    if not settings.auth.enabled:
        return
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    if token != settings.auth.token:
        raise HTTPException(status_code=403, detail="Invalid token")
