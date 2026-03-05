# HPC Tracker

A personal web dashboard for managing Slurm jobs, monitoring cluster resources, viewing logs, taking notes, and more — designed for researchers running workloads on HPC clusters.

Built with **FastAPI** (Python) + **React/TypeScript** (Vite) + **SQLite**. Runs as a lightweight daemon on the login node and is accessed via SSH tunnel from your local browser.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Stack](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

---

## Features

### Job Management
- **Live queue view** from `squeue --json` with auto-refresh
- **Job history** from `sacct --json` (past 7 days by default)
- **Submit jobs** via `sbatch` with configurable partition, GPUs, time limit, etc.
- **Cancel jobs** via `scancel`
- **Command presets** — save and reuse frequently used job submissions

### Web Terminal
- Full PTY-based terminal in your browser via `pty.fork()` + WebSocket + xterm.js
- Multiple tabs — open several terminal sessions simultaneously
- Resize support — terminal adapts to window size
- Runs directly on the login node (no SSH-in-SSH needed)

### Log Viewer
- Browse files under configured watch paths
- **Tail mode** — see the last N lines of a log file (default 200)
- **Full mode** — paginated full file view (1000 lines per page)
- **Search** — grep through log files from the browser

### Resource Monitor
- **Cluster summary** — total/allocated CPUs, GPUs, and nodes
- **Partition table** — per-partition availability
- **Node map** — visual grid of node states (idle/mixed/allocated/down) with hover details
- **Usage history chart** — CPU and GPU utilization over time (6h/12h/24h/48h)

### Dashboard
- At-a-glance summary cards for running jobs, CPU/GPU usage, node availability
- Mini job table showing recent jobs
- Quick action links to all sections

### Notes
- Create, edit, and delete notes linked to jobs
- Tag-based organization
- Optional Notion sync (via Notion API)

### Calendar
- View and create events via Google Calendar API
- Events grouped by date
- Requires one-time OAuth setup (see below)

### Email Notifications
- Configurable rules: trigger on `job_completed`, `job_failed`, `job_started`, `job_cancelled`
- Sends email via local SMTP (sendmail/postfix on the login node)
- Notification log to track delivery history

### Settings
- Server health status indicator
- Configurable Slurm defaults, email, Notion, Google Calendar, and auth settings
- All configuration stored in `config/config.yaml`

---

## Architecture

```
Browser (your laptop)
  |
  | SSH tunnel: ssh -L 8420:localhost:8420 della
  |
Login Node (della)
  |
  ├── FastAPI (uvicorn) on port 8420
  │     ├── REST API (39 endpoints across 9 routers)
  │     ├── WebSocket (terminal PTY bridge)
  │     ├── Serves pre-built React SPA as static files
  │     └── Background scheduler (asyncio tasks)
  │           ├── Poll squeue every 30s → update jobs DB
  │           ├── Poll sinfo every 60s → resource snapshots
  │           └── Check notification rules every 60s
  │
  ├── SQLite database (data/tracker.db)
  │     ├── jobs (cached from squeue/sacct)
  │     ├── job_events (state change tracking)
  │     ├── resource_snapshots (historical cluster stats)
  │     ├── notification_rules + notification_log
  │     ├── notes
  │     ├── command_presets
  │     └── settings (KV store)
  │
  └── Slurm CLI
        ├── squeue --json → live job queue
        ├── sacct --json → job history
        ├── sinfo --json → cluster info
        ├── sbatch → submit jobs
        └── scancel → cancel jobs
```

### Backend Structure

```
backend/
├── main.py              # FastAPI app factory + lifespan
├── config.py            # Pydantic Settings from config/config.yaml
├── database.py          # SQLite init (aiosqlite)
├── dependencies.py      # FastAPI dependency injection
├── routers/             # API endpoints
│   ├── health.py        # GET /api/health
│   ├── jobs.py          # /api/jobs/* (queue, history, submit, cancel)
│   ├── logs.py          # /api/logs/* (browse, read, tail, search)
│   ├── resources.py     # /api/resources/* (summary, history)
│   ├── terminal.py      # /api/terminal/* (CRUD + WebSocket)
│   ├── calendar.py      # /api/calendar/* (Google Calendar)
│   ├── notion.py        # /api/notion/* (Notion notes)
│   ├── notifications.py # /api/notifications/* (rules + log)
│   └── config.py        # /api/config/* (presets + settings)
├── services/            # Business logic
│   ├── slurm.py         # Slurm JSON parsing (squeue, sacct, sinfo)
│   ├── log_viewer.py    # File browsing + content reading
│   ├── resource_monitor.py  # Cluster aggregation
│   ├── terminal_manager.py  # PTY session management
│   ├── scheduler.py     # Background polling loops
│   ├── calendar_service.py  # Google Calendar via httpx
│   ├── notion_service.py    # Notion API via httpx
│   └── notification_service.py  # Email + rule engine
├── models/              # Pydantic schemas
├── db/
│   ├── schema.sql       # SQLite DDL (8 tables)
│   └── repository.py    # CRUD operations
└── utils/
    ├── process.py       # Async subprocess helpers
    └── auth.py          # Optional bearer token auth
```

### Frontend Structure

```
frontend/
├── package.json
├── vite.config.ts       # Vite + proxy config (ws: true for terminal)
├── tailwind.config.js   # Warm stone/amber theme
└── src/
    ├── App.tsx          # Top navigation + React Router
    ├── api/client.ts    # Fetch wrapper for /api endpoints
    ├── hooks/           # React Query hooks (useJobs, useLogs, etc.)
    ├── pages/           # 9 page components
    ├── store/           # Zustand state
    ├── types/           # TypeScript interfaces
    └── styles/globals.css
```

---

## Prerequisites

**On the HPC cluster (login node):**
- Python 3.9+ with: `fastapi`, `uvicorn`, `pydantic`, `httpx`, `websockets`, `pyyaml`
- These are typically available on clusters with `module load anaconda3` or similar
- Only 2 extra pip packages: `aiosqlite`, `eval_type_backport`
- Slurm CLI tools: `squeue`, `sacct`, `sinfo`, `sbatch`, `scancel`

**On your local machine (for frontend development):**
- Node.js 18+ and npm

---

## Quick Start

### 1. Clone and setup on the cluster

```bash
# SSH into your cluster login node
ssh della

# Clone the repo
git clone <repo-url> ~/workspace/tracker
cd ~/workspace/tracker

# Run setup (creates config, installs aiosqlite)
bash setup.sh

# Edit your config
vim config/config.yaml
```

### 2. Configure

Edit `config/config.yaml`:

```yaml
server:
  host: "127.0.0.1"
  port: 8420

slurm:
  user: ""  # leave empty to use $USER
  default_account: ""
  default_partition: "gpu"
  poll_interval_seconds: 30

logs:
  watch_paths:
    - "/home/youruser/slurm_logs"
    - "/scratch/gpfs/yourgroup/youruser"

terminal:
  max_terminals: 5
  shell: "/bin/bash"
```

### 3. Build the frontend

On your **local machine** (requires Node.js):

```bash
cd frontend
npm install
npm run build
```

Then copy the built files to the cluster:

```bash
scp -r frontend/dist/ della:~/workspace/tracker/frontend/
```

Or use the provided script:
```bash
bash scripts/build_frontend.sh
# Then scp the dist/ folder to the cluster
```

### 4. Start the server

```bash
# On the cluster
bash scripts/start.sh
# => HPC Tracker started on http://127.0.0.1:8420

# Check status
bash scripts/status.sh

# Stop
bash scripts/stop.sh
```

### 5. Access via SSH tunnel

From your local machine:

```bash
ssh -L 8420:localhost:8420 della
```

Then open http://localhost:8420 in your browser.

For persistent tunnels, add to your `~/.ssh/config`:

```
Host della
  HostName della.princeton.edu
  User yournetid
  LocalForward 8420 localhost:8420
```

---

## Frontend Development

For iterating on the UI without rebuilding each time:

```bash
# Terminal 1: SSH tunnel to cluster backend
ssh -L 8420:localhost:8420 della

# Terminal 2: Local Vite dev server
cd frontend
npm install
npm run dev
# => http://localhost:5173
```

The Vite dev server proxies all `/api` requests (including WebSocket) to `localhost:8420` (your SSH tunnel to the cluster backend). You get hot-reload on frontend changes while using live Slurm data.

---

## API Reference

All endpoints are under `/api`. The server also exposes OpenAPI docs at `/docs` when running.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/jobs/queue` | Live job queue (squeue) |
| `GET` | `/api/jobs/history` | Job history (sacct) |
| `GET` | `/api/jobs/{job_id}` | Single job details |
| `POST` | `/api/jobs/submit` | Submit a new job |
| `POST` | `/api/jobs/{job_id}/cancel` | Cancel a running job |
| `GET` | `/api/logs/roots` | List configured watch paths |
| `GET` | `/api/logs/browse` | Browse directory contents |
| `GET` | `/api/logs/content` | Read file content (paginated) |
| `GET` | `/api/logs/tail` | Tail a file (last N lines) |
| `GET` | `/api/logs/search` | Search within a file |
| `GET` | `/api/resources/summary` | Cluster summary (sinfo) |
| `GET` | `/api/resources/history` | Resource usage over time |
| `GET` | `/api/terminal` | List terminal sessions |
| `POST` | `/api/terminal` | Create a new terminal |
| `DELETE` | `/api/terminal/{id}` | Destroy a terminal |
| `POST` | `/api/terminal/{id}/resize` | Resize terminal |
| `WS` | `/api/terminal/ws/{id}` | Terminal WebSocket stream |
| `GET` | `/api/calendar/events` | List calendar events |
| `POST` | `/api/calendar/events` | Create a calendar event |
| `DELETE` | `/api/calendar/events/{id}` | Delete a calendar event |
| `GET` | `/api/notion/notes` | List notes |
| `POST` | `/api/notion/notes` | Create a note |
| `PUT` | `/api/notion/notes/{id}` | Update a note |
| `DELETE` | `/api/notion/notes/{id}` | Delete a note |
| `GET` | `/api/notifications/rules` | List notification rules |
| `POST` | `/api/notifications/rules` | Create a rule |
| `DELETE` | `/api/notifications/rules/{id}` | Delete a rule |
| `GET` | `/api/notifications/log` | Notification history |
| `GET` | `/api/config/presets` | List command presets |
| `POST` | `/api/config/presets` | Create a preset |
| `PUT` | `/api/config/presets/{id}` | Update a preset |
| `DELETE` | `/api/config/presets/{id}` | Delete a preset |

---

## Optional Integrations

### Google Calendar

Requires a Google Cloud project with the Calendar API enabled and OAuth 2.0 credentials.

```bash
# Run on a machine with a browser (your laptop)
python3 scripts/google_auth.py

# Follow the prompts to authorize and get a refresh token
# Copy the client_id, client_secret, and refresh_token into config/config.yaml
```

Then enable in `config/config.yaml`:
```yaml
google_calendar:
  enabled: true
  client_id: "your-client-id"
  client_secret: "your-client-secret"
  refresh_token: "your-refresh-token"
  calendar_id: "primary"
```

### Notion

Create an internal integration at https://www.notion.so/my-integrations.

```yaml
notion:
  enabled: true
  api_key: "ntn_..."
  database_id: "your-database-id"
```

The database should have properties: `Title` (title), `Content` (rich_text), `Tags` (multi_select), `Job ID` (rich_text).

### Email Notifications

Uses the local SMTP server (sendmail/postfix) typically available on HPC login nodes.

```yaml
notifications:
  enabled: true
  smtp_host: "localhost"
  smtp_port: 25
  from_address: "youruser@della.princeton.edu"
  to_address: "your@email.com"
```

Create notification rules in the Alerts page. Available triggers:
- `job_completed` — fires when a job finishes successfully
- `job_failed` — fires when a job fails or is killed
- `job_started` — fires when a pending job begins running
- `job_cancelled` — fires when a job is cancelled

---

## Security

This is a **single-user** tool designed to run behind SSH. Security considerations:

- **Network**: The server binds to `127.0.0.1` by default (localhost only). Access via SSH tunnel.
- **Auth**: Optional bearer token authentication. Set `auth.token` in config to require `Authorization: Bearer <token>` on all API requests.
- **Config**: `config/config.yaml` is `chmod 600` and gitignored. Tokens are never committed.
- **Path traversal**: Log viewer validates all paths resolve under configured `watch_paths`.
- **Command injection**: Job submission uses `shlex.quote()` for extra args, never `shell=True`.
- **Terminal limits**: Configurable `max_terminals` cap with automatic cleanup of dead sessions.
- **Database**: SQLite with parameterized queries throughout.

---

## Daemon Management

### Using the provided scripts

```bash
bash scripts/start.sh   # Start as background process
bash scripts/stop.sh    # Stop gracefully
bash scripts/status.sh  # Check if running + health check
```

### Using systemd (recommended for persistence)

Create `~/.config/systemd/user/hpc-tracker.service`:

```ini
[Unit]
Description=HPC Tracker Dashboard

[Service]
Type=simple
WorkingDirectory=/home/youruser/workspace/tracker
ExecStart=/usr/bin/python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8420
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable hpc-tracker
systemctl --user start hpc-tracker
systemctl --user status hpc-tracker

# Enable lingering so it runs even when you're not logged in
loginctl enable-linger $(whoami)
```

---

## Troubleshooting

**Server won't start:**
```bash
# Check if port is in use
lsof -i :8420

# Check logs
tail -f data/logs/tracker.log

# Run directly (not as daemon) to see errors
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8420
```

**Terminal not working:**
- In dev mode (`npm run dev`): Make sure the SSH tunnel is active on port 8420. The Vite proxy handles WebSocket forwarding.
- In production mode (static files): Terminal WebSocket connects directly to FastAPI. Check browser DevTools console for WebSocket errors.
- Verify PTY creation works: `curl -X POST -H "Content-Type: application/json" -d '{"title":"test"}' http://localhost:8420/api/terminal`

**Jobs page is empty:**
- Check that `squeue --json` works on the login node
- Verify the configured Slurm user matches your account
- Check `data/logs/tracker.log` for parsing errors

**Resource data missing:**
- Verify `sinfo --json` returns data. Slurm 25.x uses the `sinfo` key (not `nodes`) for partition-level data.
- The background scheduler polls every 60 seconds by default.

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | FastAPI + uvicorn | Async, fast, built-in OpenAPI docs |
| Frontend | React 18 + TypeScript + Vite | Type safety, fast builds |
| Styling | Tailwind CSS | Utility-first, no CSS bloat |
| State | React Query + Zustand | Server state caching + minimal UI state |
| Charts | Recharts | React-native charting |
| Terminal | xterm.js + @xterm/addon-fit | Industry-standard terminal emulator |
| Database | SQLite via aiosqlite | Zero setup, single file, async |
| Slurm | Native JSON (`--json` flag) | No text parsing needed (Slurm 23+) |

---

## License

MIT
