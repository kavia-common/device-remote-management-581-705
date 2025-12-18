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

4) (Optional) Seed demo data for testing:
   ./seed_demo.sh

This creates:
- Demo tenant (DemoTenant)
- Demo admin user (demoadmin@example.com)
- Sample device (localhost-snmp at 127.0.0.1)
- SNMP v2c credential (demo-public-v2c, community=public, port=161)

## Security and RLS

Row Level Security is enabled on all tenant-scoped tables. Policies rely on a session variable set by the backend:

- The backend must set the tenant ID for the session (recommended helpers):
  SELECT app.set_current_tenant('<tenant-uuid>'::uuid);
  SELECT app.set_current_user('<user-uuid>'::uuid);

Internally, policies enforce that rows are only visible and writable when the row's tenant_id matches current_setting('app.tenant_id').

Tables with optional global content (mib_modules, mib_oids, tr181_parameters) allow NULL tenant_id to represent shared/global items.

## Schema overview

Management:
- tenants(id, name, created_at)
- users(id, tenant_id, email, hashed_password, role, created_at)
- api_keys(id, tenant_id, user_id, key_hash, label, created_at, last_used_at)
- rbac_roles(id, tenant_id, name, description, permissions, created_at)
- user_roles(id, tenant_id, user_id, role_id, created_at)
- audit_logs(id, tenant_id, actor_id, action, details, created_at)

Device registry and protocol:
- devices(id, tenant_id, name, ip, metadata, created_by, created_at)
- device_protocol_profiles(id, tenant_id, device_id, protocol, profile, created_at)
- snmp_credentials(id, tenant_id, name, version, params, created_at)
- webpa_endpoints(id, tenant_id, name, base_url, auth, created_at)
- tr069_endpoints(id, tenant_id, name, base_url, auth, created_at)
- usp_endpoints(id, tenant_id, name, base_url, auth, created_at)

Jobs:
- jobs(id, tenant_id, device_id, kind, status, requested_by, params, created_at, updated_at)
- job_results(id, tenant_id, job_id, result, created_at)

Knowledge bases:
- mib_modules(id, tenant_id?, name, created_at)
- mib_oids(id, tenant_id?, module_id, oid, name, syntax, access, description, created_at)
- tr181_parameters(id, tenant_id?, path, schema, created_at)

Configurations:
- config_templates(id, tenant_id, name, protocol, content, created_at)
- device_config_versions(id, tenant_id, device_id, protocol, version, content, created_at)

Extensions used:
- citext (case-insensitive text for emails)
- pgcrypto (gen_random_uuid for UUID generation)

## Indexes

Performance-oriented indexes for common access patterns include:
- idx_tenants_name
- idx_users_tenant, idx_users_email
- idx_api_keys_tenant_user, idx_api_keys_last_used
- idx_devices_tenant, idx_devices_ip, idx_devices_name
- idx_device_protocol_profiles_device_protocol
- idx_snmp_credentials_tenant
- idx_webpa_endpoints_tenant, idx_tr069_endpoints_tenant, idx_usp_endpoints_tenant
- idx_jobs_tenant_status, idx_jobs_device, idx_jobs_updated
- idx_job_results_job
- idx_mib_modules_tenant_name, idx_mib_oids_module_oid, idx_mib_oids_oid
- idx_tr181_parameters_path
- idx_config_templates_tenant
- idx_device_config_versions_device_proto_version
- idx_audit_logs_tenant_created
- idx_rbac_roles_tenant, idx_user_roles_tenant_user

## Seeds

Seeds create:
- Default tenant
- Admin role and membership
- Admin user (admin@example.com) with placeholder hashed password
- Sample device (Router-01)
- Example SNMP credential + device protocol profile
- Example MIB module/OID and TR-181 parameter
- Example config template
- Example job and job result
- Seed audit log entry

Note:
- Demo values are placeholders; integrate with real password hashing during backend implementation.
- The backend should set the session GUCs via the helper functions before any tenant-scoped access:
  SELECT app.set_current_tenant('<tenant-uuid>');
  SELECT app.set_current_user('<user-uuid>');
