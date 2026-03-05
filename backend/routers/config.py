from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from backend.dependencies import get_database
from backend.models.jobs import CommandPreset
from backend.db import repository

router = APIRouter(prefix="/api/config", tags=["config"])


# --- Command Presets ---

@router.get("/presets", response_model=list[CommandPreset])
async def list_presets(db: aiosqlite.Connection = Depends(get_database)):
    rows = await repository.get_presets(db)
    return [CommandPreset(**r) for r in rows]


@router.post("/presets", response_model=CommandPreset)
async def create_preset(
    preset: CommandPreset,
    db: aiosqlite.Connection = Depends(get_database),
):
    preset_id = await repository.create_preset(db, preset.model_dump())
    preset.id = preset_id
    return preset


@router.put("/presets/{preset_id}", response_model=CommandPreset)
async def update_preset(
    preset_id: int,
    preset: CommandPreset,
    db: aiosqlite.Connection = Depends(get_database),
):
    await repository.update_preset(db, preset_id, preset.model_dump())
    preset.id = preset_id
    return preset


@router.delete("/presets/{preset_id}")
async def delete_preset(
    preset_id: int,
    db: aiosqlite.Connection = Depends(get_database),
):
    await repository.delete_preset(db, preset_id)
    return {"status": "deleted", "id": preset_id}


# --- Settings KV ---

@router.get("/settings/{key}")
async def get_setting(
    key: str,
    db: aiosqlite.Connection = Depends(get_database),
):
    value = await repository.get_setting(db, key)
    if value is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return {"key": key, "value": value}


@router.put("/settings/{key}")
async def set_setting(
    key: str,
    body: dict,
    db: aiosqlite.Connection = Depends(get_database),
):
    value = body.get("value", "")
    await repository.set_setting(db, key, str(value))
    return {"key": key, "value": value}
