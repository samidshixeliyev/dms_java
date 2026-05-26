#!/bin/bash
# VPS deployment script — pull, build, restart, reconnect to nginx
set -e
cd "$(dirname "$0")"

echo "==> Pulling latest code..."
git pull origin master

echo "==> Building and restarting containers..."
docker compose up --build -d

echo "==> Reconnecting dms-app to offdock nginx network..."
docker network connect offdock-internal dms-app 2>/dev/null && echo "Connected to offdock-internal" || echo "Already connected or network not present (OK)"

echo "==> Done. App running at https://16.16.71.7"
