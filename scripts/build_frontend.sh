#!/bin/bash
# Run this on a machine with Node.js, then copy frontend/dist/ to the cluster
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../frontend"

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Frontend built in frontend/dist/"
echo "Copy this directory to the cluster:"
echo "  scp -r frontend/dist/ della:~/workspace/tracker/frontend/"
