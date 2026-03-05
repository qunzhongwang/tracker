#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== HPC Tracker Setup ==="

# Create directories
mkdir -p config data/logs

# Copy example config if not exists
if [ ! -f config/config.yaml ]; then
    cp config.example.yaml config/config.yaml
    # Replace $USER and $GROUP placeholders
    sed -i "s|\$USER|$USER|g" config/config.yaml
    if [ -n "$GROUP" ]; then
        sed -i "s|\$GROUP|$GROUP|g" config/config.yaml
    fi
    chmod 600 config/config.yaml
    echo "Created config/config.yaml (edit this with your settings)"
else
    echo "config/config.yaml already exists, skipping"
fi

# Install extra dependencies (only 2 pip packages needed)
echo "Installing dependencies..."
pip install --user aiosqlite eval_type_backport 2>/dev/null || pip install aiosqlite eval_type_backport 2>/dev/null || echo "packages may already be installed"

# Verify key dependencies
echo "Checking dependencies..."
python3 -c "import fastapi; print(f'  FastAPI {fastapi.__version__}')"
python3 -c "import uvicorn; print(f'  uvicorn OK')"
python3 -c "import pydantic; print(f'  Pydantic {pydantic.__version__}')"
python3 -c "import aiosqlite; print(f'  aiosqlite OK')"
python3 -c "import yaml; print(f'  PyYAML OK')"
python3 -c "import httpx; print(f'  httpx OK')"
python3 -c "import websockets; print(f'  websockets OK')"

echo ""
echo "=== Setup complete ==="
echo "Edit config/config.yaml with your settings, then run:"
echo "  ./scripts/start.sh"
