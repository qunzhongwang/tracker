from __future__ import annotations

import json
from datetime import datetime

import aiosqlite


# --- Jobs ---

async def upsert_job(db: aiosqlite.Connection, job: dict) -> None:
    await db.execute(
        """INSERT INTO jobs (
            job_id, job_name, user_name, partition_name, account, state,
            nodes, num_nodes, num_cpus, num_gpus,
            submit_time, start_time, end_time, time_limit,
            work_dir, command, stdout_path, stderr_path, exit_code, raw_json, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(job_id) DO UPDATE SET
            state=excluded.state, nodes=excluded.nodes,
            num_nodes=excluded.num_nodes, num_cpus=excluded.num_cpus,
            num_gpus=excluded.num_gpus, start_time=excluded.start_time,
            end_time=excluded.end_time, exit_code=excluded.exit_code,
            raw_json=excluded.raw_json, last_updated=datetime('now')
        """,
        (
            job.get("job_id", ""),
            job.get("job_name", ""),
            job.get("user_name", ""),
            job.get("partition_name", ""),
            job.get("account", ""),
            job.get("state", ""),
            job.get("nodes", ""),
            job.get("num_nodes", 0),
            job.get("num_cpus", 0),
            job.get("num_gpus", 0),
            job.get("submit_time", ""),
            job.get("start_time", ""),
            job.get("end_time", ""),
            job.get("time_limit", ""),
            job.get("work_dir", ""),
            job.get("command", ""),
            job.get("stdout_path", ""),
            job.get("stderr_path", ""),
            job.get("exit_code"),
            json.dumps(job.get("raw", {})),
        ),
    )
    await db.commit()


async def get_jobs(
    db: aiosqlite.Connection,
    state: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[dict], int]:
    where = ""
    params: list = []
    if state:
        where = "WHERE state = ?"
        params.append(state)

    count_row = await db.execute_fetchall(
        f"SELECT COUNT(*) FROM jobs {where}", params
    )
    total = count_row[0][0] if count_row else 0

    rows = await db.execute_fetchall(
        f"SELECT * FROM jobs {where} ORDER BY last_updated DESC LIMIT ? OFFSET ?",
        params + [limit, offset],
    )
    return [dict(r) for r in rows], total


async def get_job_by_id(db: aiosqlite.Connection, job_id: str) -> dict | None:
    rows = await db.execute_fetchall(
        "SELECT * FROM jobs WHERE job_id = ?", (job_id,)
    )
    return dict(rows[0]) if rows else None


# --- Job Events ---

async def insert_job_event(
    db: aiosqlite.Connection, job_id: str, old_state: str, new_state: str
) -> None:
    await db.execute(
        "INSERT INTO job_events (job_id, old_state, new_state) VALUES (?, ?, ?)",
        (job_id, old_state, new_state),
    )
    await db.commit()


async def get_unnotified_events(db: aiosqlite.Connection) -> list[dict]:
    rows = await db.execute_fetchall(
        "SELECT * FROM job_events WHERE notified = 0 ORDER BY timestamp"
    )
    return [dict(r) for r in rows]


async def mark_events_notified(db: aiosqlite.Connection, event_ids: list[int]) -> None:
    if not event_ids:
        return
    placeholders = ",".join("?" for _ in event_ids)
    await db.execute(
        f"UPDATE job_events SET notified = 1 WHERE id IN ({placeholders})",
        event_ids,
    )
    await db.commit()


# --- Resource Snapshots ---

async def insert_resource_snapshot(db: aiosqlite.Connection, snap: dict) -> None:
    await db.execute(
        """INSERT INTO resource_snapshots
        (total_nodes, available_nodes, total_cpus, allocated_cpus, total_gpus, allocated_gpus, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            snap.get("total_nodes", 0),
            snap.get("available_nodes", 0),
            snap.get("total_cpus", 0),
            snap.get("allocated_cpus", 0),
            snap.get("total_gpus", 0),
            snap.get("allocated_gpus", 0),
            json.dumps(snap.get("raw", {})),
        ),
    )
    await db.commit()


async def get_resource_history(
    db: aiosqlite.Connection, hours: int = 24, limit: int = 500
) -> list[dict]:
    rows = await db.execute_fetchall(
        """SELECT * FROM resource_snapshots
        WHERE timestamp >= datetime('now', ?)
        ORDER BY timestamp DESC LIMIT ?""",
        (f"-{hours} hours", limit),
    )
    return [dict(r) for r in rows]


# --- Notification Rules ---

async def get_notification_rules(db: aiosqlite.Connection) -> list[dict]:
    rows = await db.execute_fetchall(
        "SELECT * FROM notification_rules ORDER BY id"
    )
    return [dict(r) for r in rows]


async def create_notification_rule(db: aiosqlite.Connection, rule: dict) -> int:
    cursor = await db.execute(
        """INSERT INTO notification_rules (name, enabled, event_type, condition_json, action_type, action_config)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (
            rule["name"],
            1 if rule.get("enabled", True) else 0,
            rule["event_type"],
            rule.get("condition_json", "{}"),
            rule.get("action_type", "email"),
            rule.get("action_config", "{}"),
        ),
    )
    await db.commit()
    return cursor.lastrowid


async def update_notification_rule(db: aiosqlite.Connection, rule_id: int, rule: dict) -> None:
    await db.execute(
        """UPDATE notification_rules SET name=?, enabled=?, event_type=?,
        condition_json=?, action_type=?, action_config=? WHERE id=?""",
        (
            rule["name"],
            1 if rule.get("enabled", True) else 0,
            rule["event_type"],
            rule.get("condition_json", "{}"),
            rule.get("action_type", "email"),
            rule.get("action_config", "{}"),
            rule_id,
        ),
    )
    await db.commit()


async def delete_notification_rule(db: aiosqlite.Connection, rule_id: int) -> None:
    await db.execute("DELETE FROM notification_rules WHERE id = ?", (rule_id,))
    await db.commit()


async def insert_notification_log(db: aiosqlite.Connection, entry: dict) -> None:
    await db.execute(
        """INSERT INTO notification_log (rule_id, event_type, message, success, error_message)
        VALUES (?, ?, ?, ?, ?)""",
        (
            entry.get("rule_id"),
            entry["event_type"],
            entry.get("message", ""),
            1 if entry.get("success", True) else 0,
            entry.get("error_message", ""),
        ),
    )
    await db.commit()


async def get_notification_log(
    db: aiosqlite.Connection, limit: int = 50
) -> tuple[list[dict], int]:
    count_row = await db.execute_fetchall("SELECT COUNT(*) FROM notification_log")
    total = count_row[0][0] if count_row else 0
    rows = await db.execute_fetchall(
        "SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT ?", (limit,)
    )
    return [dict(r) for r in rows], total


# --- Notes ---

async def get_notes(
    db: aiosqlite.Connection, limit: int = 100, offset: int = 0
) -> tuple[list[dict], int]:
    count_row = await db.execute_fetchall("SELECT COUNT(*) FROM notes")
    total = count_row[0][0] if count_row else 0
    rows = await db.execute_fetchall(
        "SELECT * FROM notes ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    results = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d.get("tags", "[]"))
        results.append(d)
    return results, total


async def create_note(db: aiosqlite.Connection, note: dict) -> int:
    cursor = await db.execute(
        """INSERT INTO notes (title, content, job_id, tags)
        VALUES (?, ?, ?, ?)""",
        (
            note["title"],
            note.get("content", ""),
            note.get("job_id", ""),
            json.dumps(note.get("tags", [])),
        ),
    )
    await db.commit()
    return cursor.lastrowid


async def update_note(db: aiosqlite.Connection, note_id: int, updates: dict) -> None:
    sets = []
    params = []
    for field in ("title", "content", "job_id", "tags"):
        if field in updates and updates[field] is not None:
            if field == "tags":
                sets.append(f"{field} = ?")
                params.append(json.dumps(updates[field]))
            else:
                sets.append(f"{field} = ?")
                params.append(updates[field])
    if not sets:
        return
    sets.append("updated_at = datetime('now')")
    params.append(note_id)
    await db.execute(
        f"UPDATE notes SET {', '.join(sets)} WHERE id = ?", params
    )
    await db.commit()


async def delete_note(db: aiosqlite.Connection, note_id: int) -> None:
    await db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    await db.commit()


# --- Command Presets ---

async def get_presets(db: aiosqlite.Connection) -> list[dict]:
    rows = await db.execute_fetchall(
        "SELECT * FROM command_presets ORDER BY category, name"
    )
    return [dict(r) for r in rows]


async def create_preset(db: aiosqlite.Connection, preset: dict) -> int:
    cursor = await db.execute(
        "INSERT INTO command_presets (name, description, command, category) VALUES (?, ?, ?, ?)",
        (preset["name"], preset.get("description", ""), preset["command"], preset.get("category", "general")),
    )
    await db.commit()
    return cursor.lastrowid


async def update_preset(db: aiosqlite.Connection, preset_id: int, preset: dict) -> None:
    await db.execute(
        "UPDATE command_presets SET name=?, description=?, command=?, category=? WHERE id=?",
        (preset["name"], preset.get("description", ""), preset["command"], preset.get("category", "general"), preset_id),
    )
    await db.commit()


async def delete_preset(db: aiosqlite.Connection, preset_id: int) -> None:
    await db.execute("DELETE FROM command_presets WHERE id = ?", (preset_id,))
    await db.commit()


# --- Local Calendar Events ---

async def get_local_events(
    db: aiosqlite.Connection,
    time_min: str | None = None,
    time_max: str | None = None,
    limit: int = 100,
) -> list[dict]:
    where_parts = []
    params: list = []
    if time_min:
        where_parts.append("start_time >= ?")
        params.append(time_min)
    if time_max:
        where_parts.append("start_time <= ?")
        params.append(time_max)
    where = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
    rows = await db.execute_fetchall(
        f"SELECT * FROM local_events {where} ORDER BY start_time ASC LIMIT ?",
        params + [limit],
    )
    return [dict(r) for r in rows]


async def create_local_event(db: aiosqlite.Connection, event: dict) -> int:
    cursor = await db.execute(
        """INSERT INTO local_events (summary, description, start_time, end_time, location, all_day)
        VALUES (?, ?, ?, ?, ?, ?)""",
        (
            event["summary"],
            event.get("description", ""),
            event["start"],
            event["end"],
            event.get("location", ""),
            1 if event.get("all_day") else 0,
        ),
    )
    await db.commit()
    return cursor.lastrowid


async def delete_local_event(db: aiosqlite.Connection, event_id: int) -> None:
    await db.execute("DELETE FROM local_events WHERE id = ?", (event_id,))
    await db.commit()


# --- Settings KV ---

async def get_setting(db: aiosqlite.Connection, key: str) -> str | None:
    rows = await db.execute_fetchall(
        "SELECT value FROM settings WHERE key = ?", (key,)
    )
    return rows[0][0] if rows else None


async def set_setting(db: aiosqlite.Connection, key: str, value: str) -> None:
    await db.execute(
        """INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')""",
        (key, value),
    )
    await db.commit()
