# Configuration and Environment

## Overview

Configuration for the Device Remote Management platform is driven primarily by environment variables, with sensible defaults for local development and explicit overrides required for production. This document summarizes:

- Root‑level configuration (`.env` for docker‑compose).
- Backend configuration (`BackendContainer/.env` and `Settings` class).
- Frontend configuration (`FrontendContainer/.env`).

It also describes protocol‑specific defaults and how configuration is loaded in code.

## Configuration Layers and Precedence

Configuration is set at three main layers:

1. **Root `.env`** (in `device-remote-management-581-705/`):
   - Controls docker‑compose ports and high‑level settings.
   - Provides shared values (e.g. `JWT_SECRET`) used by multiple containers.

2. **Backend `.env`** (in `BackendContainer/`):
   - Used by `pydantic-settings` via `Settings` in `src/config.py`.
   - Contains `DATABASE_URL` and any backend‑specific overrides.

3. **Frontend `.env`** (in `FrontendContainer/`):
   - Controls the compiled SPA via `VITE_` variables (Vite only exposes variables with this prefix to the browser).

The `Settings` class in `BackendContainer/src/config.py` is declared as:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    ...
```

This means:

- When running the backend from `BackendContainer`, the `.env` file in that directory is read.
- Environment variables from the host/container override `.env`.

## Root Configuration (`.env` at Repository Root)

The root `.env` described in `README.md` controls the docker‑compose stack. Typical variables include:

| Variable                | Description                                  | Default                       |
|-------------------------|----------------------------------------------|-------------------------------|
| `POSTGRES_DB`           | Database name                                | `myapp`                       |
| `POSTGRES_USER`         | Database user                                | `appuser`                     |
| `POSTGRES_PASSWORD`     | Database password                            | `dbuser123` (change in prod)  |
| `POSTGRES_EXTERNAL_PORT`| Host port mapped to PostgreSQL               | `5000`                        |
| `REDIS_EXTERNAL_PORT`   | Host port mapped to Redis                    | `6379`                        |
| `BACKEND_PORT`          | Host port mapped to backend `:8080`          | `8080`                        |
| `FRONTEND_PORT`         | Host port mapped to frontend `:80`           | `3000`                        |
| `JWT_SECRET`            | JWT signing secret used by backend/worker    | _(must be set)_               |
| `JWT_EXPIRES_IN`        | JWT expiry in seconds                        | `3600`                        |
| `CORS_ORIGINS`          | Comma‑separated list of allowed origins      | `http://localhost:3000`       |
| `ENABLE_SSE`            | Enable SSE endpoint for job events           | `true`                        |
| `VITE_API_BASE_URL`     | API base URL baked into frontend build       | `http://localhost:8080`       |

These variables are consumed by `docker-compose.yml` for service definitions, ports, and environment injection into containers.

### Example Root `.env` (Development)

```env
POSTGRES_DB=myapp
POSTGRES_USER=appuser
POSTGRES_PASSWORD=dbuser123
POSTGRES_EXTERNAL_PORT=5000

REDIS_EXTERNAL_PORT=6379

BACKEND_PORT=8080
FRONTEND_PORT=3000

JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=3600
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
ENABLE_SSE=true

VITE_API_BASE_URL=http://localhost:8080
```

In production, `POSTGRES_EXTERNAL_PORT` and `REDIS_EXTERNAL_PORT` would typically not be exposed to the public internet, and secrets must be replaced with strong values.

## Backend Configuration (`BackendContainer`)

### Settings Class

Backend configuration is centralized in `BackendContainer/src/config.py`:

```python
class Settings(BaseSettings):
    APP_NAME: str = "Device Remote Management API"
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: AnyUrl

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_IN: int = 3600

    CORS_ORIGINS: str = ""

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    ENABLE_SSE: bool = True

    SNMP_DEFAULT_TIMEOUT: float = 5.0
    SNMP_DEFAULT_RETRIES: int = 3
    SNMP_DEFAULT_PORT: int = 161
    SNMP_MAX_REPETITIONS: int = 25

    WEBPA_DEFAULT_TIMEOUT: float = 30.0
    WEBPA_DEFAULT_RETRIES: int = 3
    WEBPA_ENDPOINT: Optional[str] = None

    TR069_DEFAULT_TIMEOUT: float = 60.0
    TR069_DEFAULT_RETRIES: int = 3
    TR069_ACS_ENDPOINT: Optional[str] = None
    TR069_ACS_USERNAME: Optional[str] = None
    TR069_ACS_PASSWORD: Optional[str] = None

    USP_DEFAULT_TIMEOUT: float = 30.0
    USP_DEFAULT_RETRIES: int = 3
    USP_CONTROLLER_ENDPOINT: Optional[str] = None
    USP_TRANSPORT_MODE: str = "http"
    USP_MQTT_BROKER: Optional[str] = None
    USP_MQTT_PORT: int = 1883
```

A convenience property `cors_origins_list` splits `CORS_ORIGINS` by comma and trims whitespace.

### Backend `.env` Example

As described in `BackendContainer/README.md`, a typical `.env` in `BackendContainer` might look like:

```env
DATABASE_URL=postgresql+asyncpg://appuser:dbuser123@localhost:5000/myapp

JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=3600
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
ENABLE_SSE=true

# SNMP defaults (optional overrides)
SNMP_DEFAULT_TIMEOUT=5.0
SNMP_DEFAULT_RETRIES=3
SNMP_DEFAULT_PORT=161
SNMP_MAX_REPETITIONS=25

# WebPA defaults
WEBPA_DEFAULT_TIMEOUT=30.0
WEBPA_DEFAULT_RETRIES=3
WEBPA_ENDPOINT=

# TR-069 defaults
TR069_DEFAULT_TIMEOUT=60.0
TR069_DEFAULT_RETRIES=3
TR069_ACS_ENDPOINT=
TR069_ACS_USERNAME=
TR069_ACS_PASSWORD=

# USP defaults
USP_DEFAULT_TIMEOUT=30.0
USP_DEFAULT_RETRIES=3
USP_CONTROLLER_ENDPOINT=
USP_TRANSPORT_MODE=http
USP_MQTT_BROKER=
USP_MQTT_PORT=1883
```

In docker‑compose, these values are often injected directly into the `backend` and `worker` services via the `environment` section in `docker-compose.yml`, overriding `.env` when running in containers.

### Celery and Redis Configuration

Celery is configured in `BackendContainer/src/celery_app.py` using values from `Settings`:

- `CELERY_BROKER_URL` — defaults to `redis://localhost:6379/0`.
- `CELERY_RESULT_BACKEND` — defaults to `redis://localhost:6379/1`.

In docker‑compose, both backend and worker set:

```yaml
environment:
  DATABASE_URL: postgresql+asyncpg://appuser:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
  CELERY_BROKER_URL: redis://redis:6379/0
  CELERY_RESULT_BACKEND: redis://redis:6379/1
  JWT_SECRET: ${JWT_SECRET}
  JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
  CORS_ORIGINS: ${CORS_ORIGINS}
  ENABLE_SSE: ${ENABLE_SSE}
```

This ensures that Celery tasks and the API share the same connection settings and secrets.

### CORS and SSE

CORS is configured in `src/main.py`:

- `settings.cors_origins_list` is used to configure `CORSMiddleware` if not empty.
- It allows all methods and headers, and sets a `max_age` of 600 seconds.

SSE support is controlled by `ENABLE_SSE`:

- If `ENABLE_SSE` is `False`, the `/jobs/events/{job_id}` endpoint returns `404`.
- The frontend should be configured to use SSE only when this flag is true.

## Frontend Configuration (`FrontendContainer`)

### Vite and Environment Variables

The frontend uses Vite, which only exposes variables prefixed with `VITE_` to the browser. The relevant environment variables are described in `FrontendContainer/README.md`:

| Variable               | Description                                     | Required | Default                  |
|------------------------|-------------------------------------------------|----------|--------------------------|
| `VITE_API_BASE_URL`    | Backend API base URL                            | Yes      | `http://localhost:8080` |
| `VITE_OIDC_AUTHORITY`  | OIDC provider authority URL (future use)       | No       | _(empty)_               |
| `VITE_OIDC_CLIENT_ID`  | OIDC client ID (future use)                    | No       | _(empty)_               |
| `VITE_OIDC_REDIRECT_URI`| Redirect URI after login (future use)         | No       | _(empty)_               |

Example `.env` in `FrontendContainer`:

```env
VITE_API_BASE_URL=http://localhost:8080

# Optional OIDC configuration (not yet wired into backend)
VITE_OIDC_AUTHORITY=
VITE_OIDC_CLIENT_ID=
VITE_OIDC_REDIRECT_URI=
```

`src/services/api.ts` reads `import.meta.env.VITE_API_BASE_URL` to create the Axios instance:

```typescript
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
```

This base URL is also used indirectly for SSE URLs via `getSSEUrl` in `src/utils/realtime.ts`.

### Runtime vs Build‑time Configuration

Because Vite injects environment variables at build time:

- Changing `VITE_API_BASE_URL` after building the frontend does not change the running SPA; you must rebuild (`npm run build`) or use a runtime env injection pattern (e.g. environment‑substituted nginx config) for fully dynamic deployments.
- In docker‑compose, `frontend` uses a build argument:

```yaml
build:
  context: ./FrontendContainer
  dockerfile: Dockerfile
  args:
    VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8080}
```

This bakes the API base URL into the static assets served by nginx.

## Protocol Configuration Defaults

Protocol client modules in `BackendContainer/src/protocols/` read defaults from `Settings` and may be overridden per job via request payloads or per device via database tables.

### SNMP

Defaults (from `Settings`):

- `SNMP_DEFAULT_TIMEOUT` (seconds) — default `5.0`.
- `SNMP_DEFAULT_RETRIES` — default `3`.
- `SNMP_DEFAULT_PORT` — default `161`.
- `SNMP_MAX_REPETITIONS` — default `25`.

Job payloads (`EnqueueSNMPGet`) allow specifying credential parameters:

```json
{
  "version": "2c",
  "community": "public",
  "port": 161,
  "timeout": 5.0,
  "retries": 3
}
```

The `snmp_credentials` table stores reusable credential configurations keyed by name per tenant.

### WebPA

Defaults:

- `WEBPA_DEFAULT_TIMEOUT` — `30.0`.
- `WEBPA_DEFAULT_RETRIES` — `3`.
- `WEBPA_ENDPOINT` — optional default endpoint.

The `webpa_endpoints` table stores endpoints by tenant; tasks accept `endpoint` objects with `base_url` and `auth` fields.

### TR‑069 (ACS / ECO ACS)

Defaults:

- `TR069_DEFAULT_TIMEOUT` — `60.0`.
- `TR069_DEFAULT_RETRIES` — `3`.
- `TR069_ACS_ENDPOINT`, `TR069_ACS_USERNAME`, `TR069_ACS_PASSWORD` — optional global/default configuration.

Per‑tenant endpoints are stored in `tr069_endpoints`. Celery tasks receive concrete endpoint objects including auth and base URL.

### USP (TR‑369)

Defaults:

- `USP_DEFAULT_TIMEOUT` — `30.0`.
- `USP_DEFAULT_RETRIES` — `3`.
- `USP_CONTROLLER_ENDPOINT` — optional default controller endpoint.
- `USP_TRANSPORT_MODE` — `'http'`, `'mqtt'`, or `'websocket'` (default `'http'`).
- `USP_MQTT_BROKER`, `USP_MQTT_PORT` — for MQTT mode (not fully implemented).

Per‑tenant endpoints live in `usp_endpoints`, and the USP client reads configuration from those records at runtime.

## Environment Profiles and Best Practices

### Development (Local)

- Use the provided `.env.example` files to bootstrap configuration.
- Expose ports on localhost (`5000`, `6379`, `8080`, `3000`) for convenience.
- Use simple values for `JWT_SECRET` and `POSTGRES_PASSWORD` but avoid committing them.
- Keep `ENABLE_SSE=true` to exercise real‑time job progress.

### Staging

- Mirror production configuration as closely as possible:
  - Strong `JWT_SECRET` and `POSTGRES_PASSWORD`.
  - Restricted network access (no public DB/Redis ports).
  - TLS termination at the reverse proxy.
- Use a separate `.env` or deployment‑specific variable injection.
- Configure `VITE_API_BASE_URL` to the staging backend URL before building the frontend.

### Production

- Do not expose PostgreSQL or Redis ports externally; use private networking.
- Store secrets in a proper secrets manager and map them to environment variables for containers.
- Use strong values for all sensitive configuration fields.
- Separate configuration by environment through CI/CD (as described in `CI_CD.md`) rather than manual edits to `.env`.
- Enable comprehensive logging and monitoring of configuration‑related issues (e.g. failed DB connections, Celery broker unavailability).

## Summary

Configuration is intentionally simple and centralized:

- The backend’s `Settings` class in `src/config.py` is the single source of truth for its runtime environment.
- Docker Compose wires together containers using environment variables defined in the root `.env`.
- The frontend relies on `VITE_` variables for build‑time configuration of the API base URL and potential OIDC integration.

When making changes that affect configuration, always:

1. Update the relevant `.env.example` files.
2. Adjust `Settings` defaults or docker‑compose environment sections as needed.
3. Ensure the new configuration is reflected in this document and in `README.md` / `BackendContainer/README.md` / `FrontendContainer/README.md`.
