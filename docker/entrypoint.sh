#!/bin/sh
# Prepares the database schema before the API starts.
set -e

echo "[entrypoint] applying Prisma migrations..."
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ]; then
    echo "[entrypoint] database is not reachable, giving up." >&2
    exit 1
  fi
  echo "[entrypoint] database not ready yet, retrying in 3s ($attempt/10)..."
  sleep 3
done

echo "[entrypoint] starting API..."
exec node dist/main.js
