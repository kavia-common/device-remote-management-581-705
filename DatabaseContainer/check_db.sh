#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PSQL_CMD="$(head -n1 "${DIR}/db_connection.txt" | tr -d '\r')"

echo "Applying full migration..."
"${DIR}/migrate.sh" up

echo "Listing public tables..."
${PSQL_CMD} -v ON_ERROR_STOP=1 -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" | sed -n '3,200p' | sed '/(.*rows)/q' || true
