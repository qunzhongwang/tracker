#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PID_FILE="data/tracker.pid"
LOG_FILE="data/logs/tracker.log"

mkdir -p data/logs

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "HPC Tracker is already running (PID $PID)"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

echo "Starting HPC Tracker..."

# Read port from config if available
PORT=$(python3 -c "
import yaml, os
try:
    with open('config/config.yaml') as f:
        cfg = yaml.safe_load(f) or {}
    print(cfg.get('server', {}).get('port', 8420))
except:
    print(8420)
" 2>/dev/null || echo 8420)

HOST=$(python3 -c "
import yaml, os
try:
    with open('config/config.yaml') as f:
        cfg = yaml.safe_load(f) or {}
    print(cfg.get('server', {}).get('host', '127.0.0.1'))
except:
    print('127.0.0.1')
" 2>/dev/null || echo "127.0.0.1")

nohup python3 -m uvicorn backend.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --log-level info \
    >> "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "HPC Tracker started on http://$HOST:$PORT (PID $(cat $PID_FILE))"
echo "Log: $LOG_FILE"
echo "SSH tunnel: ssh -L $PORT:localhost:$PORT $(hostname)"
