#!/bin/bash
# Update an existing Docker deployment without exposing credentials in source code.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

git pull --ff-only origin main

(
  cd frontend
  npm ci --no-audit --no-fund
  npm run build
)

docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml restart nginx
docker compose -f docker-compose.prod.yml ps
curl --fail --silent --show-error http://localhost/health
