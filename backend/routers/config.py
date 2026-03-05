from __future__ import annotations

import os
from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import aiosqlite

from backend.config import get_settings, load_settings
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


# --- YAML Config (read / update) ---

def _config_path() -> Path:
    settings = get_settings()
    return Path(settings.base_dir) / "config" / "config.yaml"


def _read_yaml() -> dict:
    p = _config_path()
    if p.exists():
        with open(p) as f:
            return yaml.safe_load(f) or {}
    return {}


def _write_yaml(data: dict) -> None:
    p = _config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w") as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)


@router.get("/yaml")
async def get_yaml_config():
    """Return the current config.yaml contents (secrets masked)."""
    data = _read_yaml()
    # Mask sensitive fields
    masked = dict(data)
    for section in ("notion", "google_calendar", "auth"):
        if section in masked and isinstance(masked[section], dict):
            for key in ("api_key", "client_secret", "refresh_token", "token"):
                if key in masked[section] and masked[section][key]:
                    masked[section][key] = "***"
    return masked


class WatchPathsUpdate(BaseModel):
    paths: list[str]


@router.get("/watch-paths")
async def get_watch_paths():
    """Return the current log watch paths."""
    settings = get_settings()
    return {"paths": settings.logs.watch_paths}


@router.put("/watch-paths")
async def set_watch_paths(body: WatchPathsUpdate):
    """Update log watch paths in config.yaml and reload."""
    data = _read_yaml()
    if "logs" not in data:
        data["logs"] = {}
    data["logs"]["watch_paths"] = body.paths
    _write_yaml(data)
    # Reload settings
    from backend.config import load_settings, _settings
    import backend.config as cfg_mod
    cfg_mod._settings = load_settings()
    return {"paths": body.paths}


@router.post("/watch-paths/add")
async def add_watch_path(body: dict):
    """Add a single watch path."""
    path = body.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")
    expanded = os.path.expandvars(os.path.expanduser(path))
    if not Path(expanded).exists():
        raise HTTPException(status_code=400, detail=f"Path does not exist: {expanded}")

    data = _read_yaml()
    if "logs" not in data:
        data["logs"] = {}
    if "watch_paths" not in data["logs"]:
        data["logs"]["watch_paths"] = []
    if expanded not in data["logs"]["watch_paths"]:
        data["logs"]["watch_paths"].append(expanded)
    _write_yaml(data)
    import backend.config as cfg_mod
    cfg_mod._settings = load_settings()
    return {"paths": data["logs"]["watch_paths"]}


@router.post("/watch-paths/remove")
async def remove_watch_path(body: dict):
    """Remove a single watch path."""
    path = body.get("path", "").strip()
    data = _read_yaml()
    paths = data.get("logs", {}).get("watch_paths", [])
    paths = [p for p in paths if p != path]
    if "logs" not in data:
        data["logs"] = {}
    data["logs"]["watch_paths"] = paths
    _write_yaml(data)
    import backend.config as cfg_mod
    cfg_mod._settings = load_settings()
    return {"paths": paths}
