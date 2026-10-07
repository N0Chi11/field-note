#!/bin/bash
# Update an existing Docker deployment without exposing credentials in source code.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

git pull --ff-only origin main

# Add an independent short-lived photo-review cookie signer for upgraded installs.
if ! grep -Eq '^PHOTO_REVIEW_SESSION_SECRET=[0-9a-fA-F]{64}$' .env; then
  sed -i '/^PHOTO_REVIEW_SESSION_SECRET=/d' .env
  printf '\nPHOTO_REVIEW_SESSION_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
  chmod 600 .env
fi

(
  cd frontend
  npm ci --registry=https://registry.npmmirror.com --no-audit --no-fund
  npm run build
)

docker compose -f docker-compose.prod.yml up -d --build backend photo-review
docker compose -f docker-compose.prod.yml restart nginx
docker compose -f docker-compose.prod.yml ps
curl --fail --silent --show-error http://localhost/health
