#!/bin/bash
# Waits for SQL Server to be ready, then restores dms_new.bak if the database doesn't exist yet.

set -e

MSSQL_HOST="${MSSQL_HOST:-sqlserver}"
MSSQL_PORT="${MSSQL_PORT:-1433}"
SA_PASSWORD="${SA_PASSWORD:-DmsStr0ng!Pass}"
DB_NAME="${DB_NAME:-dms_new}"
BAK_FILE="/db-init/dms_new.bak"

echo "[restore] Waiting for SQL Server to be ready..."
for i in $(seq 1 30); do
    /opt/mssql-tools18/bin/sqlcmd \
        -S "$MSSQL_HOST,$MSSQL_PORT" \
        -U sa -P "$SA_PASSWORD" \
        -C -Q "SELECT 1" > /dev/null 2>&1 && break
    echo "[restore] Attempt $i/30 - SQL Server not ready yet, waiting 5s..."
    sleep 5
done

echo "[restore] Checking if database '$DB_NAME' already exists..."
DB_EXISTS=$(/opt/mssql-tools18/bin/sqlcmd \
    -S "$MSSQL_HOST,$MSSQL_PORT" \
    -U sa -P "$SA_PASSWORD" \
    -C -h -1 \
    -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = '$DB_NAME'" 2>/dev/null | tr -d '[:space:]')

if [ "$DB_EXISTS" = "1" ]; then
    echo "[restore] Database '$DB_NAME' already exists — skipping restore."
    exit 0
fi

echo "[restore] Restoring '$DB_NAME' from $BAK_FILE ..."
/opt/mssql-tools18/bin/sqlcmd \
    -S "$MSSQL_HOST,$MSSQL_PORT" \
    -U sa -P "$SA_PASSWORD" \
    -C \
    -Q "
RESTORE DATABASE [$DB_NAME]
FROM DISK = '$BAK_FILE'
WITH MOVE 'DMS' TO '/var/opt/mssql/data/${DB_NAME}.mdf',
     MOVE 'DMS_log' TO '/var/opt/mssql/data/${DB_NAME}_log.ldf',
     REPLACE, RECOVERY;
"

echo "[restore] Database restored successfully."
