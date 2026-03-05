#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/data/tracker.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "HPC Tracker is not running (no PID file)"
    exit 0
fi

PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping HPC Tracker (PID $PID)..."
    kill "$PID"
    sleep 2
    if kill -0 "$PID" 2>/dev/null; then
        echo "Force killing..."
        kill -9 "$PID"
    fi
    rm -f "$PID_FILE"
    echo "HPC Tracker stopped"
else
    echo "Process $PID not running, cleaning up PID file"
    rm -f "$PID_FILE"
fi
