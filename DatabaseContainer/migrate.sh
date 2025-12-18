#!/usr/bin/env bash
set -euo pipefail

# Migration runner for PostgreSQL that:
# - ALWAYS reads connection from db_connection.txt
# - Executes ONE SQL statement at a time via psql -c
# - Provides commands to create schema, RLS, indexes, and seed data
# - Never executes batch SQL files

# Usage:
#   ./migrate.sh plan            # Show the plan of statements to be executed
#   ./migrate.sh up              # Apply initial schema + RLS + indexes + seeds
#   ./migrate.sh schema          # Apply only schema
#   ./migrate.sh rls             # Apply only RLS
#   ./migrate.sh indexes         # Apply only indexes
#   ./migrate.sh seeds           # Apply only seed data

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${DIR}/db_connection.txt" ]]; then
  echo "ERROR: db_connection.txt not found in ${DIR}"
  exit 1
fi

# Read the full command (e.g., 'psql postgresql://...')
PSQL_CMD="$(head -n1 "${DIR}/db_connection.txt" | tr -d '\r')"

# Execute one SQL statement with psql -c
exec_sql() {
  local sql="$1"
  # Print compact preview
  local preview="$(echo "$sql" | tr -s '[:space:]' ' ' | sed 's/^ *//;s/ *$//' )"
  echo "-> $preview"
  # shellcheck disable=SC2086
  ${PSQL_CMD} -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
}

# S E C T I O N S

apply_schema() {
  echo "== Applying SCHEMA =="

  # tenants
  exec_sql "CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # users
  exec_sql "CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email CITEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # devices
  exec_sql "CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ip INET NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # protocol identifiers per device
  exec_sql "CREATE TABLE IF NOT EXISTS device_protocol_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('SNMP','WEBPA','TR69','USP')),
    identifier JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(device_id, kind)
  );"

  # jobs (async queries/operations)
  exec_sql "CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    requested_by UUID REFERENCES users(id),
    params JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # mib definitions
  exec_sql "CREATE TABLE IF NOT EXISTS mib_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    oid TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # TR-181 parameters
  exec_sql "CREATE TABLE IF NOT EXISTS tr181_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    schema JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # query history
  exec_sql "CREATE TABLE IF NOT EXISTS query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    device_id UUID REFERENCES devices(id),
    protocol TEXT NOT NULL,
    query TEXT NOT NULL,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # audit logs
  exec_sql "CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # extensions used (citext, pgcrypto for gen_random_uuid)
  exec_sql "CREATE EXTENSION IF NOT EXISTS citext;"
  exec_sql "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
}

apply_rls() {
  echo "== Applying RLS =="
  # Enable RLS
  for t in users devices device_protocol_ids jobs mib_definitions tr181_parameters query_history audit_logs; do
    exec_sql "ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;"
  done

  # Helper policies: one-tenant isolation assuming current_setting('app.tenant_id') is set by backend
  # The backend should run: SET app.tenant_id = '<tenant-uuid>';
  # Admins can bypass through role checks if needed (future).
  exec_sql "DROP POLICY IF EXISTS tenant_isolation_users ON users;"
  exec_sql "CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_devices ON devices;"
  exec_sql "CREATE POLICY tenant_isolation_devices ON devices
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_device_protocol_ids ON device_protocol_ids;"
  exec_sql "CREATE POLICY tenant_isolation_device_protocol_ids ON device_protocol_ids
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_jobs ON jobs;"
  exec_sql "CREATE POLICY tenant_isolation_jobs ON jobs
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_mib_definitions ON mib_definitions;"
  exec_sql "CREATE POLICY tenant_isolation_mib_definitions ON mib_definitions
    USING (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_tr181_parameters ON tr181_parameters;"
  exec_sql "CREATE POLICY tenant_isolation_tr181_parameters ON tr181_parameters
    USING (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_query_history ON query_history;"
  exec_sql "CREATE POLICY tenant_isolation_query_history ON query_history
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  exec_sql "DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;"
  exec_sql "CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"
}

apply_indexes() {
  echo "== Applying INDEXES =="

  exec_sql "CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_device_protocol_ids_device_kind ON device_protocol_ids(device_id, kind);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_query_history_tenant_created ON query_history(tenant_id, created_at DESC);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_mib_definitions_oid ON mib_definitions(oid);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_tr181_parameters_path ON tr181_parameters(path);"
}

apply_seeds() {
  echo "== Applying SEEDS =="
  # Seed a default tenant and admin user for development
  # Create tenant
  exec_sql "INSERT INTO tenants (id, name) VALUES (gen_random_uuid(), 'Default') ON CONFLICT (name) DO NOTHING;"

  # Fetch tenant id to use for subsequent inserts; we cannot run multiple statements, so use a trick:
  # Store into a temporary GUC (session var) via SELECT set_config and then read via current_setting in following inserts
  exec_sql "SELECT set_config('app.seed_tenant_id', (SELECT id::text FROM tenants WHERE name='Default' LIMIT 1), true);"

  # Create admin user if not exists
  exec_sql "INSERT INTO users (id, tenant_id, email, hashed_password, role)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'admin@example.com', 'demo-hash', 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');"

  # Sample device
  exec_sql "INSERT INTO devices (id, tenant_id, name, ip, metadata)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'Router-01', '192.168.1.1', '{}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM devices WHERE name='Router-01');"

  # Sample protocol IDs
  exec_sql "INSERT INTO device_protocol_ids (id, tenant_id, device_id, kind, identifier)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM devices WHERE name='Router-01' LIMIT 1),
           'SNMP', jsonb_build_object('community', 'public')
    WHERE NOT EXISTS (SELECT 1 FROM device_protocol_ids WHERE kind='SNMP' AND device_id=(SELECT id FROM devices WHERE name='Router-01' LIMIT 1));"

  # Sample MIB def marker
  exec_sql "INSERT INTO mib_definitions (id, name, oid, content)
    SELECT gen_random_uuid(), 'RFC1213-MIB', '1.3.6.1.2.1', 'placeholder content'
    WHERE NOT EXISTS (SELECT 1 FROM mib_definitions WHERE name='RFC1213-MIB');"

  # Sample TR-181 parameter
  exec_sql "INSERT INTO tr181_parameters (id, path, schema)
    SELECT gen_random_uuid(), 'Device.DeviceInfo.', '{\"title\":\"DeviceInfo\"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM tr181_parameters WHERE path='Device.DeviceInfo.');"

  # Sample job and history
  exec_sql "INSERT INTO jobs (id, tenant_id, device_id, kind, status, params)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM devices WHERE name='Router-01' LIMIT 1),
           'SNMP_GET', 'completed', jsonb_build_object('oid', '1.3.6.1.2.1.1.1.0')
    WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE kind='SNMP_GET');"

  exec_sql "INSERT INTO query_history (id, tenant_id, user_id, device_id, protocol, query, response)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),
           (SELECT id FROM devices WHERE name='Router-01' LIMIT 1),
           'SNMP', '1.3.6.1.2.1.1.1.0', '{\"sysDescr\":\"Example Device OS v1.0\"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM query_history WHERE protocol='SNMP' AND query='1.3.6.1.2.1.1.1.0');"

  exec_sql "INSERT INTO audit_logs (id, tenant_id, actor_id, action, details)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),
           'seed_init',
           '{\"source\":\"migrate.sh\"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action='seed_init');"
}

show_plan() {
  cat <<PLAN
Plan:
  1. Schema:
     - tenants, users, devices, device_protocol_ids, jobs,
       mib_definitions, tr181_parameters, query_history, audit_logs
     - Extensions: citext, pgcrypto
  2. RLS: tenant-based isolation using current_setting('app.tenant_id')
  3. Indexes: performance indexes for common lookups
  4. Seeds: default tenant, admin user, sample device and data
PLAN
}

cmd="${1:-up}"
case "$cmd" in
  plan)    show_plan ;;
  schema)  apply_schema ;;
  rls)     apply_rls ;;
  indexes) apply_indexes ;;
  seeds)   apply_seeds ;;
  up)
    apply_schema
    apply_rls
    apply_indexes
    apply_seeds
    ;;
  *)
    echo "Unknown command: $cmd"
    echo "Usage: $0 [plan|schema|rls|indexes|seeds|up]"
    exit 1
    ;;
esac

echo "Done."
