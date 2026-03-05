from __future__ import annotations

import aiosqlite
from pathlib import Path

from backend.config import get_settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await init_db()
    return _db


async def init_db() -> aiosqlite.Connection:
    global _db
    settings = get_settings()
    db_path = Path(settings.base_dir) / settings.database.path
    db_path.parent.mkdir(parents=True, exist_ok=True)

    _db = await aiosqlite.connect(str(db_path))
    _db.row_factory = aiosqlite.Row
    await _db.execute("PRAGMA journal_mode=WAL")
    await _db.execute("PRAGMA foreign_keys=ON")

    schema_path = Path(__file__).parent / "db" / "schema.sql"
    schema_sql = schema_path.read_text()
    await _db.executescript(schema_sql)
    await _db.commit()

    return _db


async def close_db():
    global _db
    if _db is not None:
        await _db.close()
        _db = None
