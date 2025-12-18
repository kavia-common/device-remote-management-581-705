#!/usr/bin/env bash
set -euo pipefail

# seed_demo.sh - Seed demo tenant, admin user, and SNMP device
# Uses one-statement psql -c calls and RLS context helpers

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${DIR}/db_connection.txt" ]]; then
  echo "ERROR: db_connection.txt not found in ${DIR}"
  exit 1
fi

# Read the full psql command
PSQL_CMD="$(head -n1 "${DIR}/db_connection.txt" | tr -d '\r')"

# Execute one SQL statement
exec_sql() {
  local sql="$1"
  local preview
  preview="$(echo "$sql" | tr -s '[:space:]' ' ' | sed 's/^ *//;s/ *$//' )"
  echo "-> $preview"
  # shellcheck disable=SC2086
  ${PSQL_CMD} -v ON_ERROR_STOP=1 -c "$sql" >/dev/null
}

echo "== Seeding Demo Data =="

# Create demo tenant 'DemoTenant'
exec_sql "INSERT INTO tenants (id, name) SELECT gen_random_uuid(), 'DemoTenant' WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE name='DemoTenant');"

# Store tenant_id in session GUC for subsequent inserts
exec_sql "SELECT set_config('app.seed_tenant_id', (SELECT id::text FROM tenants WHERE name='DemoTenant' LIMIT 1), true);"

# Set RLS context for demo tenant
exec_sql "SELECT app.set_current_tenant((current_setting('app.seed_tenant_id'))::uuid);"

# Create admin user for demo tenant
exec_sql "INSERT INTO users (id, tenant_id, email, hashed_password, role) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'demoadmin@example.com', 'demo-hash-changeme', 'admin' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='demoadmin@example.com');"

# Store user_id
exec_sql "SELECT set_config('app.seed_user_id', (SELECT id::text FROM users WHERE email='demoadmin@example.com' LIMIT 1), true);"

# Set RLS context for demo user
exec_sql "SELECT app.set_current_user((current_setting('app.seed_user_id'))::uuid);"

# Create sample device (localhost/127.0.0.1 SNMP v2c)
exec_sql "INSERT INTO devices (id, tenant_id, name, ip, metadata, created_by) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'localhost-snmp', '127.0.0.1'::inet, '{\"description\":\"Local SNMP device for demo\"}'::jsonb, (current_setting('app.seed_user_id'))::uuid WHERE NOT EXISTS (SELECT 1 FROM devices WHERE name='localhost-snmp' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid);"

# Create SNMP v2c credential (community=public, port=161)
exec_sql "INSERT INTO snmp_credentials (id, tenant_id, name, version, params) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'demo-public-v2c', 'v2c', jsonb_build_object('community', 'public', 'port', 161, 'timeout', 5.0, 'retries', 3) WHERE NOT EXISTS (SELECT 1 FROM snmp_credentials WHERE tenant_id=(current_setting('app.seed_tenant_id'))::uuid AND name='demo-public-v2c');"

# Bind device to SNMP credential via device_protocol_profiles
exec_sql "INSERT INTO device_protocol_profiles (id, tenant_id, device_id, protocol, profile) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, (SELECT id FROM devices WHERE name='localhost-snmp' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid LIMIT 1), 'SNMP', jsonb_build_object('credential', 'demo-public-v2c', 'version', '2c') WHERE NOT EXISTS (SELECT 1 FROM device_protocol_profiles WHERE device_id=(SELECT id FROM devices WHERE name='localhost-snmp' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid LIMIT 1) AND protocol='SNMP');"

# Add audit log entry
exec_sql "INSERT INTO audit_logs (id, tenant_id, actor_id, action, details) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, (current_setting('app.seed_user_id'))::uuid, 'demo_seed', '{\"source\":\"seed_demo.sh\", \"device\":\"localhost-snmp\"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action='demo_seed' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid);"

echo "Demo data seeded successfully."
echo "Tenant: DemoTenant"
echo "User: demoadmin@example.com"
echo "Device: localhost-snmp (127.0.0.1)"
echo "SNMP Credential: demo-public-v2c (v2c, community=public, port=161)"

# Create demo tenant 'DemoTenant'
exec_sql "INSERT INTO tenants (id, name) SELECT gen_random_uuid(), 'DemoTenant' WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE name='DemoTenant');"

# Store tenant_id in session GUC for subsequent inserts
exec_sql "SELECT set_config('app.seed_tenant_id', (SELECT id::text FROM tenants WHERE name='DemoTenant' LIMIT 1), true);"

# Set RLS context for demo tenant
exec_sql "SELECT app.set_current_tenant((current_setting('app.seed_tenant_id'))::uuid);"

# Create admin user for demo tenant
exec_sql "INSERT INTO users (id, tenant_id, email, hashed_password, role) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'demoadmin@example.com', 'demo-hash-changeme', 'admin' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='demoadmin@example.com');"

# Store user_id
exec_sql "SELECT set_config('app.seed_user_id', (SELECT id::text FROM users WHERE email='demoadmin@example.com' LIMIT 1), true);"

# Set RLS context for demo user
exec_sql "SELECT app.set_current_user((current_setting('app.seed_user_id'))::uuid);"

# Create sample device (localhost/127.0.0.1 SNMP v2c)
exec_sql "INSERT INTO devices (id, tenant_id, name, ip, metadata, created_by) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'localhost-snmp', '127.0.0.1'::inet, '{\"description\":\"Local SNMP device for demo\"}'::jsonb, (current_setting('app.seed_user_id'))::uuid WHERE NOT EXISTS (SELECT 1 FROM devices WHERE name='localhost-snmp' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid);"

# Create SNMP v2c credential (community=public, port=161)
exec_sql "INSERT INTO snmp_credentials (id, tenant_id, name, version, params) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, 'demo-public-v2c', 'v2c', jsonb_build_object('community', 'public', 'port', 161, 'timeout', 5.0, 'retries', 3) WHERE NOT EXISTS (SELECT 1 FROM snmp_credentials WHERE tenant_id=(current_setting('app.seed_tenant_id'))::uuid AND name='demo-public-v2c');"

# Bind device to SNMP credential via device_protocol_profiles
exec_sql "INSERT INTO device_protocol_profiles (id, tenant_id, device_id, protocol, profile) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, (SELECT id FROM devices WHERE name='localhost-snmp' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid LIMIT 1), 'SNMP', jsonb_build_object('credential', 'demo-public-v2c', 'version', '2c') WHERE NOT EXISTS (SELECT 1 FROM device_protocol_profiles WHERE device_id=(SELECT id FROM devices WHERE name='localhost-snmp' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid LIMIT 1) AND protocol='SNMP');"

# Add audit log entry
exec_sql "INSERT INTO audit_logs (id, tenant_id, actor_id, action, details) SELECT gen_random_uuid(), (current_setting('app.seed_tenant_id'))::uuid, (current_setting('app.seed_user_id'))::uuid, 'demo_seed', '{\"source\":\"seed_demo.sh\", \"device\":\"localhost-snmp\"}'::jsonb WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action='demo_seed' AND tenant_id=(current_setting('app.seed_tenant_id'))::uuid);"

echo "Demo data seeded successfully."
echo "Tenant: DemoTenant"
echo "User: demoadmin@example.com"
echo "Device: localhost-snmp (127.0.0.1)"
echo "SNMP Credential: demo-public-v2c (v2c, community=public, port=161)"
