#!/usr/bin/env bash
set -euo pipefail

# Migration runner for PostgreSQL that:
# - ALWAYS reads connection from db_connection.txt
# - Executes ONE SQL statement at a time via psql -c
# - Provides commands to create schema, RLS, indexes, helper functions, and seed data
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

# Execute exactly one SQL statement with psql -c
exec_sql() {
  local sql="$1"
  local preview
  preview="$(echo "$sql" | tr -s '[:space:]' ' ' | sed 's/^ *//;s/ *$//' )"
  echo "-> $preview"
  # shellcheck disable=SC2086
  ${PSQL_CMD} -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
}

# S E C T I O N S

apply_schema() {
  echo "== Applying SCHEMA =="

  # Extensions used (ensure available)
  exec_sql "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
  exec_sql "CREATE EXTENSION IF NOT EXISTS citext;"

  # Optional dedicated app schema for helper functions
  exec_sql "CREATE SCHEMA IF NOT EXISTS app;"

  # Helper GUC functions in app schema for setting current tenant and user
  exec_sql "CREATE OR REPLACE FUNCTION app.set_current_tenant(tenant_uuid UUID) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('app.tenant_id', tenant_uuid::text, true); END $$;"
  exec_sql "CREATE OR REPLACE FUNCTION app.set_current_user(user_uuid UUID) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('app.user_id', user_uuid::text, true); END $$;"

  # Tenants
  exec_sql "CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # Users
  exec_sql "CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email CITEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # API keys (per user)
  exec_sql "CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    UNIQUE (tenant_id, user_id, key_hash)
  );"

  # Devices
  exec_sql "CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ip INET NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # Device protocol profiles (generic store of protocol settings per device)
  exec_sql "CREATE TABLE IF NOT EXISTS device_protocol_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL CHECK (protocol IN ('SNMP','WEBPA','TR69','USP')),
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, protocol)
  );"

  # SNMP credentials (shared per tenant optional)
  exec_sql "CREATE TABLE IF NOT EXISTS snmp_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT NOT NULL CHECK (version IN ('v2c','v3')),
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
  );"

  # WebPA endpoints (per tenant)
  exec_sql "CREATE TABLE IF NOT EXISTS webpa_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    auth JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
  );"

  # TR-069 (ACS) endpoints (per tenant)
  exec_sql "CREATE TABLE IF NOT EXISTS tr069_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    auth JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
  );"

  # USP/TR-369 endpoints (per tenant)
  exec_sql "CREATE TABLE IF NOT EXISTS usp_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    auth JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
  );"

  # Jobs (async queries/operations)
  exec_sql "CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    requested_by UUID REFERENCES users(id),
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # Job results (keep heavy results/history separate)
  exec_sql "CREATE TABLE IF NOT EXISTS job_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id)
  );"

  # MIB modules (module-level info)
  exec_sql "CREATE TABLE IF NOT EXISTS mib_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
  );"

  # MIB OIDs (node-level info)
  exec_sql "CREATE TABLE IF NOT EXISTS mib_oids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    module_id UUID REFERENCES mib_modules(id) ON DELETE CASCADE,
    oid TEXT NOT NULL,
    name TEXT,
    syntax TEXT,
    access TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # TR-181 parameters (allow NULL tenant_id for shared/global)
  exec_sql "CREATE TABLE IF NOT EXISTS tr181_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    schema JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, path)
  );"

  # Configuration templates (per tenant, by protocol)
  exec_sql "CREATE TABLE IF NOT EXISTS config_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    protocol TEXT NOT NULL CHECK (protocol IN ('SNMP','WEBPA','TR69','USP')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name, protocol)
  );"

  # Device config versions (versioned configs applied to device)
  exec_sql "CREATE TABLE IF NOT EXISTS device_config_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL CHECK (protocol IN ('SNMP','WEBPA','TR69','USP')),
    version INTEGER NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (device_id, protocol, version)
  );"

  # Audit logs
  exec_sql "CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );"

  # RBAC roles (per tenant)
  exec_sql "CREATE TABLE IF NOT EXISTS rbac_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
  );"

  # User roles (membership)
  exec_sql "CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id, role_id)
  );"
}

apply_rls() {
  echo "== Applying RLS =="

  # Enable RLS on all tenant-scoped tables
  for t in users api_keys devices device_protocol_profiles snmp_credentials webpa_endpoints tr069_endpoints usp_endpoints jobs job_results mib_modules mib_oids tr181_parameters config_templates device_config_versions audit_logs rbac_roles user_roles; do
    exec_sql "ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;"
  done

  # Policies (tenant isolation)
  # Users
  exec_sql "DROP POLICY IF EXISTS rls_users ON users;"
  exec_sql "CREATE POLICY rls_users ON users
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # API keys
  exec_sql "DROP POLICY IF EXISTS rls_api_keys ON api_keys;"
  exec_sql "CREATE POLICY rls_api_keys ON api_keys
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # Devices
  exec_sql "DROP POLICY IF EXISTS rls_devices ON devices;"
  exec_sql "CREATE POLICY rls_devices ON devices
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # Device protocol profiles
  exec_sql "DROP POLICY IF EXISTS rls_device_protocol_profiles ON device_protocol_profiles;"
  exec_sql "CREATE POLICY rls_device_protocol_profiles ON device_protocol_profiles
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # SNMP credentials
  exec_sql "DROP POLICY IF EXISTS rls_snmp_credentials ON snmp_credentials;"
  exec_sql "CREATE POLICY rls_snmp_credentials ON snmp_credentials
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # WebPA endpoints
  exec_sql "DROP POLICY IF EXISTS rls_webpa_endpoints ON webpa_endpoints;"
  exec_sql "CREATE POLICY rls_webpa_endpoints ON webpa_endpoints
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # TR-069 endpoints
  exec_sql "DROP POLICY IF EXISTS rls_tr069_endpoints ON tr069_endpoints;"
  exec_sql "CREATE POLICY rls_tr069_endpoints ON tr069_endpoints
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # USP endpoints
  exec_sql "DROP POLICY IF EXISTS rls_usp_endpoints ON usp_endpoints;"
  exec_sql "CREATE POLICY rls_usp_endpoints ON usp_endpoints
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # Jobs
  exec_sql "DROP POLICY IF EXISTS rls_jobs ON jobs;"
  exec_sql "CREATE POLICY rls_jobs ON jobs
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # Job Results
  exec_sql "DROP POLICY IF EXISTS rls_job_results ON job_results;"
  exec_sql "CREATE POLICY rls_job_results ON job_results
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # MIB modules (allow NULL tenant_id for global)
  exec_sql "DROP POLICY IF EXISTS rls_mib_modules ON mib_modules;"
  exec_sql "CREATE POLICY rls_mib_modules ON mib_modules
    USING (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));"

  # MIB OIDs (allow NULL tenant_id for global)
  exec_sql "DROP POLICY IF EXISTS rls_mib_oids ON mib_oids;"
  exec_sql "CREATE POLICY rls_mib_oids ON mib_oids
    USING (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));"

  # TR-181 parameters (allow NULL tenant_id for global)
  exec_sql "DROP POLICY IF EXISTS rls_tr181_parameters ON tr181_parameters;"
  exec_sql "CREATE POLICY rls_tr181_parameters ON tr181_parameters
    USING (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));"

  # Config templates
  exec_sql "DROP POLICY IF EXISTS rls_config_templates ON config_templates;"
  exec_sql "CREATE POLICY rls_config_templates ON config_templates
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # Device config versions
  exec_sql "DROP POLICY IF EXISTS rls_device_config_versions ON device_config_versions;"
  exec_sql "CREATE POLICY rls_device_config_versions ON device_config_versions
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # Audit logs
  exec_sql "DROP POLICY IF EXISTS rls_audit_logs ON audit_logs;"
  exec_sql "CREATE POLICY rls_audit_logs ON audit_logs
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # RBAC roles
  exec_sql "DROP POLICY IF EXISTS rls_rbac_roles ON rbac_roles;"
  exec_sql "CREATE POLICY rls_rbac_roles ON rbac_roles
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"

  # User roles
  exec_sql "DROP POLICY IF EXISTS rls_user_roles ON user_roles;"
  exec_sql "CREATE POLICY rls_user_roles ON user_roles
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));"
}

apply_indexes() {
  echo "== Applying INDEXES =="

  exec_sql "CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_user ON api_keys(tenant_id, user_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_device_protocol_profiles_device_protocol ON device_protocol_profiles(device_id, protocol);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_snmp_credentials_tenant ON snmp_credentials(tenant_id);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_webpa_endpoints_tenant ON webpa_endpoints(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_tr069_endpoints_tenant ON tr069_endpoints(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_usp_endpoints_tenant ON usp_endpoints(tenant_id);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_jobs_device ON jobs(device_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_jobs_updated ON jobs(updated_at DESC);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_job_results_job ON job_results(job_id);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_mib_modules_tenant_name ON mib_modules(tenant_id, name);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_mib_oids_module_oid ON mib_oids(module_id, oid);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_mib_oids_oid ON mib_oids(oid);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_tr181_parameters_path ON tr181_parameters(path);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_config_templates_tenant ON config_templates(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_device_config_versions_device_proto_version ON device_config_versions(device_id, protocol, version);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);"

  exec_sql "CREATE INDEX IF NOT EXISTS idx_rbac_roles_tenant ON rbac_roles(tenant_id);"
  exec_sql "CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user ON user_roles(tenant_id, user_id);"
}

apply_seeds() {
  echo "== Applying SEEDS =="

  # Default tenant
  exec_sql "INSERT INTO tenants (id, name) VALUES (gen_random_uuid(), 'Default') ON CONFLICT (name) DO NOTHING;"

  # Store tenant id to a temporary session GUC for subsequent inserts
  exec_sql "SELECT set_config('app.seed_tenant_id', (SELECT id::text FROM tenants WHERE name='Default' LIMIT 1), true);"

  # Admin RBAC role
  exec_sql "INSERT INTO rbac_roles (id, tenant_id, name, description, permissions)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'admin', 'Full access', '[]'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM rbac_roles WHERE name='admin' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid);"

  # Admin user
  exec_sql "INSERT INTO users (id, tenant_id, email, hashed_password, role)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'admin@example.com', 'demo-hash', 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='admin@example.com');"

  # Bind user to admin role
  exec_sql "INSERT INTO user_roles (id, tenant_id, user_id, role_id)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),
           (SELECT id FROM rbac_roles WHERE name='admin' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid LIMIT 1)
    WHERE NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE tenant_id=(current_setting('app.seed_tenant_id'))::uuid
        AND user_id=(SELECT id FROM users WHERE email='admin@example.com' LIMIT 1)
        AND role_id=(SELECT id FROM rbac_roles WHERE name='admin' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid LIMIT 1)
    );"

  # Demo device
  exec_sql "INSERT INTO devices (id, tenant_id, name, ip, metadata)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'Router-01', '192.168.1.1', '{}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM devices WHERE name='Router-01');"

  # SNMP credential sample
  exec_sql "INSERT INTO snmp_credentials (id, tenant_id, name, version, params)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'public-v2c', 'v2c', jsonb_build_object('community','public')
    WHERE NOT EXISTS (SELECT 1 FROM snmp_credentials WHERE tenant_id=(current_setting('app.seed_tenant_id'))::uuid AND name='public-v2c');"

  # Device protocol profile referencing the snmp credential by name
  exec_sql "INSERT INTO device_protocol_profiles (id, tenant_id, device_id, protocol, profile)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM devices WHERE name='Router-01' LIMIT 1),
           'SNMP',
           jsonb_build_object('credential','public-v2c','poll_interval',60)
    WHERE NOT EXISTS (
      SELECT 1 FROM device_protocol_profiles WHERE device_id=(SELECT id FROM devices WHERE name='Router-01' LIMIT 1) AND protocol='SNMP'
    );"

  # Demo MIB module and an OID
  exec_sql "INSERT INTO mib_modules (id, name)
    SELECT gen_random_uuid(), 'RFC1213-MIB'
    WHERE NOT EXISTS (SELECT 1 FROM mib_modules WHERE name='RFC1213-MIB');"

  exec_sql "INSERT INTO mib_oids (id, module_id, oid, name, description)
    SELECT gen_random_uuid(),
           (SELECT id FROM mib_modules WHERE name='RFC1213-MIB' LIMIT 1),
           '1.3.6.1.2.1.1.1.0', 'sysDescr', 'A textual description of the entity.'
    WHERE NOT EXISTS (SELECT 1 FROM mib_oids WHERE oid='1.3.6.1.2.1.1.1.0');"

  # Demo TR-181 parameter
  exec_sql "INSERT INTO tr181_parameters (id, path, schema)
    SELECT gen_random_uuid(), 'Device.DeviceInfo.', '{\"title\":\"DeviceInfo\"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM tr181_parameters WHERE path='Device.DeviceInfo.');"

  # Demo config template
  exec_sql "INSERT INTO config_templates (id, tenant_id, name, protocol, content)
    SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'default-snmp', 'SNMP', jsonb_build_object('credential','public-v2c')
    WHERE NOT EXISTS (SELECT 1 FROM config_templates WHERE tenant_id=(current_setting('app.seed_tenant_id'))::uuid AND name='default-snmp' AND protocol='SNMP');"

  # Demo job and job_result
  exec_sql "INSERT INTO jobs (id, tenant_id, device_id, kind, status, requested_by, params)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM devices WHERE name='Router-01' LIMIT 1),
           'SNMP_GET', 'completed',
           (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),
           jsonb_build_object('oid','1.3.6.1.2.1.1.1.0')
    WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE kind='SNMP_GET');"

  exec_sql "INSERT INTO job_results (id, tenant_id, job_id, result)
    SELECT gen_random_uuid(),
           (current_setting('app.seed_tenant_id'))::uuid,
           (SELECT id FROM jobs WHERE kind='SNMP_GET' LIMIT 1),
           '{\"sysDescr\":\"Example Device OS v1.0\"}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM job_results WHERE job_id=(SELECT id FROM jobs WHERE kind='SNMP_GET' LIMIT 1));"

  # Audit trail
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
     - app schema with helper functions: app.set_current_tenant(uuid), app.set_current_user(uuid)
     - tenants, users, api_keys, devices,
       device_protocol_profiles, snmp_credentials,
       webpa_endpoints, tr069_endpoints, usp_endpoints,
       jobs, job_results,
       mib_modules, mib_oids, tr181_parameters,
       config_templates, device_config_versions,
       audit_logs, rbac_roles, user_roles
     - Extensions: citext, pgcrypto
  2. RLS: tenant-based isolation using current_setting('app.tenant_id')
     - Global-allowed tables: mib_modules, mib_oids, tr181_parameters (NULL tenant_id)
  3. Indexes: performance indexes for common lookups
  4. Seeds: default tenant, admin user, RBAC admin role, demo device and data
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
