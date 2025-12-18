# BackendContainer

FastAPI backend for the Device Remote Management platform.

Features:
- FastAPI app with CORS, JWT auth, and OpenAPI
- Async PostgreSQL via SQLAlchemy + asyncpg
- Tenant context middleware to set PostgreSQL GUCs for Row Level Security:
  - SELECT app.set_current_tenant('<tenant-uuid>'::uuid)
  - SELECT app.set_current_user('<user-uuid>'::uuid)
- Route stubs for auth, tenants, users, devices (CRUD placeholders)
- MIB module upload, parsing (pysmi/pysnmp), and OID browsing with background Celery tasks
- TR-181 parameter catalog with search, tree view, and validation
- OpenAPI generation endpoint and export CLI

## Quick start

1) Create .env from example and configure:
```
cp .env.example .env
```

2) Install and run:
```
pip install -e .
uvicorn src.main:app --host 0.0.0.0 --port 8080
```

3) Open API docs:
- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc
- OpenAPI JSON: http://localhost:8080/openapi.json

Export to file:
```
python -m src.main --export-openapi openapi.json
```

## Environment variables

See .env.example. Important:
- DATABASE_URL (e.g., postgresql+asyncpg://appuser:dbuser123@localhost:5000/myapp)
- JWT_SECRET
- JWT_EXPIRES_IN (seconds, default 3600)
- CORS_ORIGINS (comma-separated; include FrontendContainer URL, e.g., http://localhost:5173)
- CELERY_BROKER_URL (e.g., redis://redis:6379/0)
- CELERY_RESULT_BACKEND (e.g., redis://redis:6379/1)
- ENABLE_SSE=true|false

## Docker

Build and run:
```
docker build -t drm-backend .
docker run --env-file .env -p 8080:8080 drm-backend
```

## Celery worker

Requires Redis accessible via CELERY_BROKER_URL/CELERY_RESULT_BACKEND.

Start API:
```
uvicorn src.main:app --host 0.0.0.0 --port 8080
```

Start worker (from project root of BackendContainer):
```
celery -A src.celery_app.celery_app worker -l info -Q celery
```

Tasks implemented:
- job.snmp_get
- job.webpa_get
- job.tr069_get
- job.usp_get
- mib.parse_file

Enqueue via API:
- POST /jobs/enqueue/snmp/get
- POST /jobs/enqueue/webpa/get
- POST /jobs/enqueue/tr069/get
- POST /jobs/enqueue/usp/get

Subscribe to progress (SSE):
- GET /jobs/events/{job_id}

## RLS tenant context

Middleware extracts tenant_id and user_id from JWT and calls:
```
SELECT app.set_current_tenant($1::uuid);
SELECT app.set_current_user($1::uuid);
```
on each new DB connection/transaction. Update tokens to include these claims: tenant_id, sub.

## Frontend integration

Set Frontend .env:
- VITE_API_BASE_URL=http://localhost:8080

CORS must include the frontend origin so browsers can call the API.

## MIB and TR-181 Features

### MIB Management

Upload and parse SNMP MIB files:
- POST /mib/upload (multipart form: file, optional name)
  - Accepts .mib, .txt, or .tar.gz archives
  - Returns task_id for background parsing via Celery
- GET /mib/modules (list with search, pagination)
- GET /mib/modules/{id} (module details)
- GET /mib/modules/{id}/oids (list OIDs with prefix/name search)
- DELETE /mib/modules/{id} (delete tenant-owned module)

MIB parsing uses pysmi/pysnmp to extract OID definitions and store in mib_modules/mib_oids tables with RLS context.

### TR-181 Parameter Catalog

Manage TR-181 data model parameters:
- POST /tr181/import (import seed data from source)
- GET /tr181/parameters (search by path prefix, type, access, with pagination)
- GET /tr181/tree (hierarchical tree by path segments, root_path query param)
- GET /tr181/parameters/{id} (parameter details)
- POST /tr181/validate (validate proposed parameter sets before applying)

TR-181 data stored in tr181_parameters table with global (NULL tenant_id) and tenant-specific entries.

This is a scaffold: endpoints expose schemas and expected shapes; integrate actual persistence and business logic in follow-up tasks.
