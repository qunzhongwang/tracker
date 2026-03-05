from __future__ import annotations

from fastapi import APIRouter, Depends, Query
import aiosqlite

from backend.dependencies import get_database
from backend.models.resources import ClusterSummary, ResourceSnapshot
from backend.services.resource_monitor import get_cluster_summary
from backend.db import repository

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("", response_model=ClusterSummary)
async def get_resources():
    return await get_cluster_summary()


@router.get("/history", response_model=list[ResourceSnapshot])
async def get_resource_history(
    hours: int = Query(24, le=168),
    limit: int = Query(500, le=2000),
    db: aiosqlite.Connection = Depends(get_database),
):
    rows = await repository.get_resource_history(db, hours=hours, limit=limit)
    return [ResourceSnapshot(**r) for r in rows]
