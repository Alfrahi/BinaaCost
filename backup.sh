#!/bin/bash
set -e

# BinaaCost Daily S3 Backup Script
# Should be executed via cron (e.g. 0 2 * * * /path/to/backup.sh)

S3_BUCKET=${S3_BUCKET:-"s3://binaacost-backups"}
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="/tmp/pb_backups"
BACKUP_FILE="${BACKUP_DIR}/data_${TIMESTAMP}.db"
CONTAINER_NAME="binaacost_pocketbase"

mkdir -p "$BACKUP_DIR"

echo "Starting SQLite backup at $TIMESTAMP..."

# Perform safe SQLite backup inside the container
# SQLite is installed in the pocketbase image via our Dockerfile
docker exec "$CONTAINER_NAME" sh -c "sqlite3 /pb_data/data.db \".backup '/tmp/backup.db'\""

# Copy backup from container to host
docker cp "$CONTAINER_NAME":/tmp/backup.db "$BACKUP_FILE"

# Clean up container temp file
docker exec "$CONTAINER_NAME" rm -f /tmp/backup.db

echo "Compressing backup..."
gzip -f "$BACKUP_FILE"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo "Uploading to S3..."
# Requires aws-cli to be configured on the host
aws s3 cp "$BACKUP_FILE_GZ" "${S3_BUCKET}/db_backups/$(basename $BACKUP_FILE_GZ)"

echo "Cleaning up local backup..."
rm -f "$BACKUP_FILE_GZ"

echo "Backup completed successfully."
