# DatabaseContainer

PostgreSQL database for the Device Remote Management platform.

Key points:
- Connection is always read from db_connection.txt (e.g., `psql postgresql://appuser:dbuser123@localhost:5000/myapp`)
- Migrations are executed one SQL statement at a time via `psql -c`
- No batch .sql files are created or executed

## Getting started

1) Ensure PostgreSQL is running and the database/user exist.
   The provided `startup.sh` helps create DB and user on a local environment:
   - DB: myapp
   - User: appuser
   - Port: 5000

2) Verify the connection command:
   cat db_connection.txt
   Example:
   psql postgresql://appuser:dbuser123@localhost:5000/myapp

3) Apply schema, RLS, indexes, and seeds:
   ./migrate.sh up

You can also run specific phases:
- ./migrate.sh plan
- ./migrate.sh schema
- ./migrate.sh rls
- ./migrate.sh indexes
- ./migrate.sh seeds

## Security and RLS

Row Level Security is enabled on all tenant-scoped tables. Policies rely on a session variable set by the backend:

- The backend must set the tenant ID for the session:
  SET app.tenant_id = '<tenant-uuid>';

Policies enforce that rows are only visible and writable when the row's tenant_id matches current_setting('app.tenant_id').

Tables with optional global content (mib_definitions, tr181_parameters) allow NULL tenant_id to represent shared/global items.

## Schema overview

- tenants(id, name, created_at)
- users(id, tenant_id, email, hashed_password, role, created_at)
- devices(id, tenant_id, name, ip, metadata, created_by, created_at)
- device_protocol_ids(id, tenant_id, device_id, kind, identifier, created_at)
- jobs(id, tenant_id, device_id, kind, status, requested_by, params, result, created_at, updated_at)
- mib_definitions(id, tenant_id?, name, oid, content, created_at)
- tr181_parameters(id, tenant_id?, path, schema, created_at)
- query_history(id, tenant_id, user_id, device_id, protocol, query, response, created_at)
- audit_logs(id, tenant_id, actor_id, action, details, created_at)

Extensions used:
- citext (case-insensitive text for emails)
- pgcrypto (gen_random_uuid for UUID generation)

## Indexes

Performance-oriented indexes for common access patterns:
- idx_users_tenant
- idx_devices_tenant
- idx_devices_ip
- idx_device_protocol_ids_device_kind
- idx_jobs_tenant_status
- idx_query_history_tenant_created
- idx_audit_logs_tenant_created
- idx_mib_definitions_oid
- idx_tr181_parameters_path

## Seeds

Seeds create:
- Default tenant
- Admin user (admin@example.com) with placeholder hashed password
- Sample device (Router-01) and protocol identifiers
- Sample MIB/TR-181 entries
- Sample job, query history, and audit log

Note: Replace demo values and integrate with real password hashing during backend implementation.
