# Security Model

## Overview

The Device Remote Management platform is designed around multi‑tenant isolation, authenticated access, and secure handling of long‑running device operations. Security is enforced at multiple layers:

- JWT‑based authentication and tenant context propagation in the backend.
- Row Level Security (RLS) policies in PostgreSQL to isolate tenant data.
- A database schema that supports RBAC roles and API keys.
- Secure storage of secrets and configuration via environment variables.
- Audit logging capabilities at the database level.

This document describes the current implementation in the repository and highlights areas that are scaffolds or candidates for future hardening.

## Authentication and JWT Tokens

### Token Creation

JWT handling is implemented in `BackendContainer/src/security/auth.py`:

- Password hashing and verification use `passlib.context.CryptContext` with bcrypt:
  - `hash_password(plain_password: str) -> str`
  - `verify_password(plain_password: str, hashed_password: str) -> bool`
- Token creation is handled by:

```python
def create_access_token(
    subject: str,
    tenant_id: str,
    additional_claims: Optional[Dict[str, Any]] = None,
    expires_in: Optional[int] = None,
) -> str:
    ...
```

Tokens contain the following standard claims:

- `sub` — user id (string).
- `tenant_id` — tenant id (string).
- `iat` — issued at timestamp (seconds since epoch, UTC).
- `exp` — expiration timestamp (defaults to `JWT_EXPIRES_IN` seconds from creation).
- `nbf` — not‑before timestamp.

The token is signed with:

- `JWT_SECRET` — secret used to sign the token (required).
- `JWT_ALGORITHM` — signing algorithm (default `"HS256"`).

These values are provided from environment variables and loaded via the `Settings` class in `BackendContainer/src/config.py`.

### Token Verification

Token verification is encapsulated in:

```python
def decode_token(token: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    ...
```

This function:

1. Uses `jose.jwt.decode` with `JWT_SECRET` and `JWT_ALGORITHM`.
2. Returns a tuple `(ok, claims, error)` where:
   - `ok` indicates success or failure.
   - `claims` is a dict of decoded claims on success.
   - `error` is an error message string on failure.

Route code does not call `decode_token` directly; instead, the middleware is responsible for decoding the token and attaching claims to the request state.

### Authentication Routes (Scaffold)

The primary authentication endpoints are defined in `BackendContainer/src/api/routes/auth.py`:

- `POST /auth/login` — accepts `LoginRequest { email, password }`.
- `POST /auth/register` — accepts `RegisterRequest { email, password, tenant_name? }`.

Both endpoints currently mint demo tokens with hard‑coded user and tenant ids and do not query the database. They are intentionally marked as scaffolds:

- `/auth/login` accepts any non‑empty password, creates a demo user/tenant id, and returns a `TokenResponse`.
- `/auth/register` hashes the password but does not persist the user; it also returns a token with demo ids.

This behavior is suitable for internal demos but must be replaced with real database lookups, password verification, and tenant/user creation logic before production use.

### Frontend Token Storage

The frontend stores authentication state using Zustand in `FrontendContainer/src/store/auth.ts`:

- `token: string | null` — JWT token (persisted using `zustand/middleware/persist`).
- `user: User | null` — user object containing `id`, `username`, `email`, and optionally `tenant_id`.

The `login` method:

- Writes both `token` and `user` into the store.
- Writes `auth_token` into `localStorage` to support SSE and WebSocket clients.

The `logout` method clears the store and removes `auth_token` from `localStorage`.

The Axios service in `FrontendContainer/src/services/api.ts` injects the token into the `Authorization` header for every HTTP request:

```typescript
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

## Tenant Context and Row Level Security

### TenantContextMiddleware

The middleware in `BackendContainer/src/middleware/tenant_context.py` is responsible for extracting tenant and user identifiers from JWTs:

1. Reads the `Authorization` header and extracts the bearer token.
2. Calls `decode_token(token)` to validate and decode the token.
3. Extracts:
   - `tenant_id` from the `tenant_id` claim.
   - `user_id` from the `sub` claim.
4. Attaches these values to `request.state`:

```python
request.state.tenant_id = tenant_id
request.state.user_id = user_id
```

All RLS‑aware routes access these values when opening database sessions.

### Database Session and GUCs

The backend uses an async SQLAlchemy engine and session factory configured in `BackendContainer/src/db/session.py`. The key functions are:

- `get_engine()` — returns the global `AsyncEngine`.
- `get_db_session(tenant_id: Optional[str], user_id: Optional[str])` — an async context manager that:
  - Opens an `AsyncSession`.
  - Calls `_apply_rls_context(session, tenant_id, user_id)` before yielding the session.
  - Commits or rolls back on exit.

`_apply_rls_context` uses helper functions defined by migrations:

```python
if tenant_id:
    await session.execute(text("SELECT app.set_current_tenant(:tenant_id::uuid)"), {"tenant_id": tenant_id})
if user_id:
    await session.execute(text("SELECT app.set_current_user(:user_id::uuid)"), {"user_id": user_id})
```

These helper functions are created in `DatabaseContainer/migrate.sh`:

```sql
CREATE OR REPLACE FUNCTION app.set_current_tenant(tenant_uuid UUID) RETURNS VOID ...
CREATE OR REPLACE FUNCTION app.set_current_user(user_uuid UUID) RETURNS VOID ...
```

They set PostgreSQL configuration parameters `app.tenant_id` and `app.user_id`, which are then used by RLS policies via `current_setting('app.tenant_id', true)`.

### RLS Policies

Every tenant‑scoped table has RLS enabled and a policy that enforces tenant isolation. Examples (from `DatabaseContainer/migrate.sh`):

For strictly tenant‑scoped tables like `users`:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_users ON users
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
```

For tables that allow global rows, such as `mib_modules`, `mib_oids`, and `tr181_parameters`:

```sql
CREATE POLICY rls_tr181_parameters ON tr181_parameters
  USING (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));
```

Backend components always obtain sessions through `get_db_session`, so these policies are consistently applied. For example:

- `src/api/routes/mib.py` uses `get_db_session` for listing, fetching, and deleting modules and OIDs.
- `src/api/routes/tr181.py` uses `get_db_session` for searching, building trees, and validating TR‑181 parameters.
- `src/api/routes/jobs.py` uses `get_db_session` when inserting jobs and polling job status for SSE.

## Authorization and RBAC

### Current State

Authorization is currently coarse‑grained:

- Routes rely on the presence of a valid JWT and a non‑null `tenant_id` and `user_id` in `request.state`.
- There is no explicit role‑based check in route handlers (`admin` vs `user`, etc.).

The `users` table includes a simple `role` column (e.g. `'admin'`, `'user'`), but this role is not yet used for access control in the FastAPI code.

### RBAC Tables

The schema already includes tables to support stronger RBAC:

- `rbac_roles`:
  - `tenant_id`, `name`, `description`, `permissions` (JSONB).
  - Allows defining per‑tenant roles with structured permission sets.
- `user_roles`:
  - `tenant_id`, `user_id`, `role_id`.
  - Binds users to roles within a tenant.

Although no API endpoints or middleware currently enforce these roles, they can be leveraged in future work to:

- Restrict tenant creation/management endpoints to admins.
- Introduce per‑resource permissions such as “manage devices”, “run jobs”, “manage MIBs”, or “view audit logs”.

Any future RBAC implementation should ensure that:

- Role assignments themselves are still subject to RLS.
- Effective permissions are computed server‑side based on both the user’s row‑level role and their memberships in `rbac_roles`/`user_roles`.

## API Keys

The `api_keys` table provides a schema for API key authentication:

- `tenant_id` and `user_id` link a key to a specific user and tenant.
- `key_hash` stores a hashed representation of the API key (the plaintext should never be stored).
- `label`, `created_at`, and `last_used_at` allow tracking and managing keys.

At present:

- There is no route in the backend that issues, lists, or verifies API keys.
- All authentication is based on JWTs.

A future API key mechanism would need:

- A route to create API keys (admin‑only within a tenant).
- A middleware or dependency to accept `X-API-KEY` headers, hash and compare, and derive the corresponding `tenant_id` and `user_id`.

## SSE and Real‑Time Security

The SSE endpoint for job progress is:

- `GET /jobs/events/{job_id}` in `src/api/routes/jobs.py`.

Security considerations:

- The endpoint checks `ENABLE_SSE` from configuration; if disabled, it returns `404`.
- It obtains `tenant_id` and `user_id` from `request.state`, which in turn relies on the standard JWT‑based `Authorization` header and `TenantContextMiddleware`.

The frontend `useSSE` hook in `FrontendContainer/src/utils/realtime.ts` currently:

- Reads `auth_token` from `localStorage`.
- Appends `?token=<jwt>` to the SSE URL because standard `EventSource` does not support custom headers.

However, the backend does *not* currently read `token` from the query string; it only uses the `Authorization` header. This results in a security/functional mismatch:

- For browser‑based SSE clients using `EventSource`, authentication will not be enforced correctly unless an additional mechanism is implemented on the backend to parse the `token` query parameter.

To harden this:

- Either update the backend to read and validate `token` from the querystring specifically for SSE endpoints, or
- Use a reverse proxy or custom SSE client that can attach authorization headers consistently.

In all cases, job events are still subject to RLS because the SQL queries in `_sse_event_stream` run inside an RLS‑aware session. If tenant context is missing, the endpoint emits an error SSE event and returns.

## Secrets Management

### Sensitive Variables

Key secrets used by the system include:

- `JWT_SECRET` — signing key for JWTs (backend).
- `POSTGRES_PASSWORD` — password for the PostgreSQL user.
- Any protocol credentials stored in `snmp_credentials`, `webpa_endpoints`, `tr069_endpoints`, and `usp_endpoints`.

These values are provided via environment variables:

- At the root (`.env`) as described in `README.md`.
- Within `BackendContainer/.env` as described in `BackendContainer/README.md`.

### Handling Secrets Safely

Recommended practices:

- Do not commit `.env` files with real secrets to source control.
- Use secret management services in production (e.g. AWS Secrets Manager, Vault) and map them to environment variables at runtime.
- Generate strong values:
  - For `JWT_SECRET`, use a minimum of 256 bits of entropy, e.g.:

    ```bash
    openssl rand -hex 32
    ```

  - For `POSTGRES_PASSWORD`, use long, random, mixed‑case values.
- Restrict database and Redis network access to trusted hosts only; in production, do not expose their ports to the public internet.

## Data Protection and Transport Security

### At Rest

- PostgreSQL data is stored in the `postgres_data` volume.
- Redis data is persisted via the `redis_data` volume using append‑only files.

While the schema uses `citext` and `jsonb`, there is no built‑in encryption of application data at rest in this repository. In production:

- Enable disk encryption at the storage layer (e.g. encrypted volumes).
- Protect backup files (`pg_dump` outputs) with appropriate access controls.
- Consider application‑level encryption for especially sensitive fields (e.g. protocol passwords) if required by policy.

### In Transit

Within development/docker‑compose environments:

- Services communicate over an internal bridge network (`drm-network`) without TLS.
- External access is usually via `http://localhost:3000` (frontend) and `http://localhost:8080` (backend).

In production:

- All external traffic must be protected with TLS, typically via a reverse proxy (nginx, Traefik, ALB, etc.) as described in `DEPLOYMENT.md`.
- Configure CORS properly (`CORS_ORIGINS`) to restrict allowed origins to trusted frontend domains.
- Enforce HTTPS in client applications and use secure cookies or token storage patterns that align with your threat model.

## Auditing and Logging

### Audit Logs

The `audit_logs` table records tenant‑scoped actions:

- `tenant_id` scopes logs to the tenant.
- `actor_id` references the user performing the action.
- `action` is a human‑readable string (e.g. `'seed_init'` for initial seeding).
- `details` is a JSONB field for structured metadata.

The initial seed process in `migrate.sh` creates at least one audit log entry. At present, there is no application code that automatically writes audit logs for API operations; future work can:

- Add audit logging in sensitive routes (e.g. user and role management, device modifications, credential updates).
- Use `get_db_session` and RLS so that audit logs automatically inherit tenant context.

### Application Logging

The backend uses the standard `logging` module in Python:

- `src/api/routes/mib.py` and `src/api/routes/tr181.py` log success and error messages.
- `src/mib/parser.py` logs parsing and extraction details.

Docker and docker‑compose surface logs at the container level; in production, `DEPLOYMENT.md` suggests integrating with centralized log aggregation (e.g. ELK, Loki, CloudWatch).

To improve security visibility:

- Standardize on structured (JSON) logs for all security‑relevant events.
- Ensure log messages do not include sensitive data such as plaintext passwords or raw tokens.

## Known Gaps and Future Hardening

The current implementation provides a solid security skeleton but requires additional work for production‑grade deployment:

- **Authentication**:
  - Implement real login and registration flows backed by the `users` and `tenants` tables.
  - Integrate with password hashing for real accounts.
  - Consider adding OIDC/OAuth2 integration as hinted by the frontend `.env` placeholders.
- **RBAC enforcement**:
  - Introduce middleware or dependencies to enforce roles and permissions using `rbac_roles` and `user_roles`.
  - Audit privileged actions such as tenant creation, role assignment, and credential modifications.
- **API key support**:
  - Implement API key issuance and verification using the `api_keys` table.
  - Support `X-API-KEY` headers or similar patterns where appropriate.
- **SSE and WebSocket auth alignment**:
  - Align SSE and any future WebSocket endpoints with the chosen authentication strategy (headers vs query parameters).
- **Secret rotation**:
  - Establish rotation procedures for `JWT_SECRET` and protocol credentials, including token invalidation strategies if using stateless JWTs.
- **Compliance and hardening**:
  - Add rate limiting on authentication and job enqueue endpoints.
  - Enable production‑grade logging, monitoring, and alerting for both security events and availability.

Until these enhancements are implemented, the platform should be treated as a development or demo environment rather than a fully hardened multi‑tenant production system.
