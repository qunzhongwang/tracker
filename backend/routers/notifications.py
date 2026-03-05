from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from backend.dependencies import get_database
from backend.models.notifications import (
    NotificationRule, NotificationRuleListResponse,
    NotificationLogResponse, NotificationLogEntry,
)
from backend.db import repository

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/rules", response_model=NotificationRuleListResponse)
async def list_rules(db: aiosqlite.Connection = Depends(get_database)):
    rows = await repository.get_notification_rules(db)
    return NotificationRuleListResponse(
        rules=[NotificationRule(**r) for r in rows]
    )


@router.post("/rules", response_model=NotificationRule)
async def create_rule(
    rule: NotificationRule,
    db: aiosqlite.Connection = Depends(get_database),
):
    rule_id = await repository.create_notification_rule(db, rule.model_dump())
    rule.id = rule_id
    return rule


@router.put("/rules/{rule_id}", response_model=NotificationRule)
async def update_rule(
    rule_id: int,
    rule: NotificationRule,
    db: aiosqlite.Connection = Depends(get_database),
):
    await repository.update_notification_rule(db, rule_id, rule.model_dump())
    rule.id = rule_id
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: int,
    db: aiosqlite.Connection = Depends(get_database),
):
    await repository.delete_notification_rule(db, rule_id)
    return {"status": "deleted", "id": rule_id}


@router.get("/log", response_model=NotificationLogResponse)
async def get_log(
    limit: int = 50,
    db: aiosqlite.Connection = Depends(get_database),
):
    rows, total = await repository.get_notification_log(db, limit=limit)
    return NotificationLogResponse(
        entries=[NotificationLogEntry(**r) for r in rows],
        total=total,
    )
