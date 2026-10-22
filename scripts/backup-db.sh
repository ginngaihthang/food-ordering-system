#!/usr/bin/env bash
set -uo pipefail

CONTAINER="${DB_CONTAINER:-food_ordering}"
DB_NAME="${DB_NAME:-food_ordering}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"

if ! docker exec "$CONTAINER" pg_dump -U "$DB_USER" --clean --if-exists "$DB_NAME" | gzip > "$FILE"; then
  rm -f "$FILE"
  echo "Backup failed" >&2
  exit 1
fi

# Delete backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "Backup saved: $FILE"