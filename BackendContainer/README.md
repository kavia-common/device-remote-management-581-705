# BackendContainer

FastAPI backend for the Device Remote Management platform.

Features:
- FastAPI app with CORS, JWT auth, and OpenAPI
- Async PostgreSQL via SQLAlchemy + asyncpg
- Tenant context middleware to set PostgreSQL GUCs for Row Level Security:
  - SELECT app.set_current_tenant('<tenant-uuid>'::uuid)
  - SELECT app.set_current_user('<user-uuid>'::uuid)
- Route stubs for auth, tenants, users, devices (CRUD placeholders)
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

## Docker

Build and run:
```
docker build -t drm-backend .
docker run --env-file .env -p 8080:8080 drm-backend
```

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

This is a scaffold: endpoints expose schemas and expected shapes; integrate actual persistence and business logic in follow-up tasks.
