#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/tracker.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "HPC Tracker is not running"
    exit 1
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
    echo "HPC Tracker is running (PID $PID)"

    # Try to get port from config
    PORT=$(python3 -c "
import yaml
try:
    with open('$PROJECT_DIR/config/config.yaml') as f:
        cfg = yaml.safe_load(f) or {}
    print(cfg.get('server', {}).get('port', 8420))
except:
    print(8420)
" 2>/dev/null || echo 8420)

    echo "URL: http://localhost:$PORT"

    # Quick health check
    curl -s "http://localhost:$PORT/api/health" 2>/dev/null && echo "" || echo "Health check failed"
else
    echo "HPC Tracker is not running (stale PID file)"
    rm -f "$PID_FILE"
    exit 1
fi
