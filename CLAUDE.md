# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

HPC Tracker is a personal web dashboard for managing Slurm jobs, viewing logs, monitoring cluster resources, taking notes, and getting a web terminal — all from a single self-hosted FastAPI app running on Princeton's Della HPC login node.

## Environment Constraints

- **Python 3.9** on the cluster — every `.py` file must start with `from __future__ import annotations` for `X | Y` union syntax
- **No Node.js** on the login node — frontend is built locally and `frontend/dist/` is copied to the cluster
- **Slurm 25.11** with native JSON output (`squeue --json`, `sinfo --json`, `sacct --json`)
- Only 2 pip packages beyond pre-installed: `aiosqlite` and `eval_type_backport`
- Config with secrets lives in `config/config.yaml` (gitignored, `chmod 600`)

## Commands

```bash
# Backend (on cluster)
./setup.sh                    # First-time: creates config, installs deps
./scripts/start.sh            # Start as background daemon (nohup)
./scripts/stop.sh             # Stop daemon
./scripts/status.sh           # Check if running + health check
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8420  # Run in foreground
curl http://localhost:8420/api/health  # Verify running

# Frontend (on local machine with Node.js)
cd frontend && npm install && npm run dev    # Dev server on :5173, proxies /api to :8420
cd frontend && npm run build                 # Production build to frontend/dist/
```

Access via SSH tunnel: `ssh -L 8420:localhost:8420 della`

## Architecture

**Backend** (`backend/`): FastAPI app with 9 router modules, all mounted under `/api`. The app factory is in `main.py` with a lifespan manager that initializes the DB, starts background polling, and cleans up on shutdown.

**Request flow**: Router → Service → (Slurm CLI / SQLite / External API). Routers are thin HTTP handlers; services contain business logic. The DB connection is a module-level singleton (`database.py:get_db()`), injected into routers via FastAPI dependency `dependencies.py:get_database()`.

**Key services**:
- `services/slurm.py` — Parses native JSON from `squeue`/`sacct`/`sinfo`. The JSON schema varies by Slurm version; fields like `tres`, `state`, `gres` can be strings, lists, or nested dicts, so parsers defensively handle multiple formats.
- `services/terminal_manager.py` — Manages PTY sessions via `pty.fork()`. The WebSocket endpoint in `routers/terminal.py` bridges xterm.js to the PTY fd.
- `services/scheduler.py` — Three `asyncio.create_task` loops: job polling (configurable interval), resource snapshots (5 min), notification processing (30 sec). State changes detected by comparing cached job state trigger `job_events` rows.
- `services/log_viewer.py` — All file access is path-validated against `config.logs.watch_paths` to prevent traversal.

**Database**: Single SQLite file (`data/tracker.db`) via `aiosqlite` with WAL mode. Schema auto-applied from `db/schema.sql` on startup. 8 tables: `jobs`, `job_events`, `resource_snapshots`, `notification_rules`, `notification_log`, `notes`, `command_presets`, `settings`. All CRUD is in `db/repository.py`.

**Frontend** (`frontend/`): React 18 SPA with React Router. Each page has a corresponding hook (`hooks/use*.ts`) wrapping React Query calls to `api/client.ts`. State management is Zustand (UI-only state like sidebar toggle). Styling is Tailwind with a custom dark theme (`surface-0` through `surface-3`, `accent`).

**Static file serving**: When `frontend/dist/` exists, `main.py` mounts it and serves `index.html` as a catch-all for SPA routing. API routes (`/api/*`) take priority because routers are registered before the catch-all.

## Slurm JSON Gotchas (Della-specific)

These are the actual formats encountered on Slurm 25.11 — not what docs might suggest:
- `sinfo --json`: Data is under the `sinfo` key (not `nodes`). Each entry is partition-level with nested `nodes.nodes` list, `cpus` dict, `node.state` list.
- `sacct --json`: `tres.allocated` is a list of dicts `[{"type":"gres","name":"gpu","count":4}]`, not a string. `state.current` is a list like `["TIMEOUT"]`.
- `squeue --json`: Numeric fields may be `{"number": 42, "set": true}` dicts or plain ints depending on the field.
- The `gres` field in sinfo can be a list, not a string — `_parse_gres_gpus()` in `resource_monitor.py` handles this.

## API Route Prefixes

| Router | Prefix | Purpose |
|---|---|---|
| health | `/api` | Health check |
| jobs | `/api/jobs` | Slurm queue, history, submit, cancel |
| logs | `/api/logs` | File browser, read, tail, search, SSE stream |
| resources | `/api/resources` | Cluster summary, history snapshots |
| terminal | `/api/terminal` | PTY CRUD + WebSocket at `/api/terminal/ws/{id}` |
| calendar | `/api/calendar` | Google Calendar via httpx |
| notion | `/api/notes` | Local notes CRUD + Notion sync |
| notifications | `/api/notifications` | Alert rules + log |
| config | `/api/config` | Command presets + KV settings |
