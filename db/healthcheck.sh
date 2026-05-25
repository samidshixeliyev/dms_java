#!/bin/bash
# SQL Server health check — used by docker-compose healthcheck
/opt/mssql-tools18/bin/sqlcmd \
    -S "localhost,1433" \
    -U sa -P "${SA_PASSWORD:-DmsStr0ng!Pass}" \
    -C -Q "SELECT 1" > /dev/null 2>&1
