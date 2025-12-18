# Deployment Guide

## Overview

This guide provides a concise, code‑aware overview of how to deploy the Device Remote Management platform in different environments. It is intended as a navigation layer on top of the more detailed deployment documentation already present in the repository:

- Root README: [`../README.md`](../README.md)
- Docker configuration: [`../DOCKER.md`](../DOCKER.md)
- Production deployment guide: [`../DEPLOYMENT.md`](../DEPLOYMENT.md)
- CI/CD pipeline guide: [`../CI_CD.md`](../CI_CD.md)

The implementation details referenced here are derived from:

- `docker-compose.yml`
- Backend configuration in `BackendContainer/src/config.py`
- Database schema and migrations in `DatabaseContainer/migrate.sh`
- Frontend build configuration in `FrontendContainer/vite.config.ts` and `Dockerfile`

## Deployment Topologies

At a high level, the platform can be deployed in three main topologies:

1. **Local development without full Docker**  
   Database and Redis run in containers, but backend and frontend run directly on the host.
2. **Single‑host Docker Compose**  
   All services (db, redis, db‑migrate, backend, worker, frontend) are run as containers via `docker-compose`.
3. **Cloud / Orchestrated Deployment**  
   Components are deployed using managed services (RDS, ElastiCache) and container orchestration (ECS, Kubernetes, etc.), as described in `DEPLOYMENT.md` and `CI_CD.md`.

The same application code and configuration model is used in each topology; only the packaging and infrastructure differ.

## Local Development

### Option 1: Full Stack via Docker Compose

This is the quickest way to get the full platform running locally.

1. **Clone and configure:**

   ```bash
   cd device-remote-management-581-705
   cp .env.example .env
   # Edit .env to set JWT_SECRET and adjust ports if needed
   ```

2. **Start services:**

   ```bash
   docker-compose up -d
   ```

   This starts:

   - `db` (PostgreSQL)
   - `redis` (Redis)
   - `db-migrate` (runs `DatabaseContainer/migrate.sh up` once)
   - `backend` (FastAPI API)
   - `worker` (Celery worker)
   - `frontend` (nginx serving React SPA)

3. **Check status:**

   ```bash
   docker-compose ps
   docker-compose logs -f backend
   ```

4. **Access applications:**

   - Frontend: `http://localhost:${FRONTEND_PORT:-3000}`
   - Backend docs: `http://localhost:${BACKEND_PORT:-8080}/docs`
   - ReDoc: `http://localhost:${BACKEND_PORT:-8080}/redoc`

The `db-migrate` container writes `db_connection.txt` in `DatabaseContainer` and runs `migrate.sh up` to initialize schema, RLS, indexes, and seed data.

### Option 2: Hybrid (Local Backend/Frontend, Containerized DB/Redis)

For a more typical developer workflow you can:

1. Start only database and Redis via docker‑compose:

   ```bash
   docker-compose up -d db redis
   ```

2. Run the backend locally:

   ```bash
   cd BackendContainer
   cp .env.example .env
   # Point DATABASE_URL to localhost:5000 (from root .env)
   pip install -e .
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
   ```

3. Run the Celery worker locally:

   ```bash
   cd BackendContainer
   celery -A src.celery_app.celery_app worker -l info -Q celery
   ```

4. Run the frontend locally:

   ```bash
   cd FrontendContainer
   cp .env.example .env
   npm install
   npm run dev
   ```

This matches the architecture described in the backend and frontend READMEs while allowing rapid iteration.

## Docker Compose Deployment

The canonical docker‑compose definition is in `docker-compose.yml`. It defines:

- `db` — PostgreSQL 15 with data volume `postgres_data`.
- `redis` — Redis 7 with `redis_data`.
- `db-migrate` — one‑shot migration runner mounting `DatabaseContainer`.
- `backend` — built from `BackendContainer/Dockerfile`.
- `worker` — built from `BackendContainer/Dockerfile`, running `celery`.
- `frontend` — built from `FrontendContainer/Dockerfile` with `VITE_API_BASE_URL` passed as a build arg.

The service interaction and health checks are fully described in [`../DOCKER.md`](../DOCKER.md). A few key points:

- **Startup order** is enforced with `depends_on` and health conditions:
  - `db` and `redis` start first and become healthy.
  - `db-migrate` waits for `db` health, then runs `migrate.sh up`.
  - `backend` and `worker` wait for `db-migrate` to complete successfully.
  - `frontend` waits for `backend` to be healthy.
- **Ports**:
  - `db`: `${POSTGRES_EXTERNAL_PORT:-5000}:5432` (development convenience).
  - `redis`: `${REDIS_EXTERNAL_PORT:-6379}:6379`.
  - `backend`: `${BACKEND_PORT:-8080}:8080`.
  - `frontend`: `${FRONTEND_PORT:-3000}:80`.

For everyday operations, see `../DOCKER.md` and `OPERATIONS_RUNBOOK.md`.

## Production Deployment Overview

The detailed production guidance is in [`../DEPLOYMENT.md`](../DEPLOYMENT.md). This section summarizes the main options and how they relate to the codebase.

### Single Server with Docker Compose

For small deployments:

- Use the same `docker-compose.yml`, but:
  - Do not expose PostgreSQL and Redis ports publicly.
  - Use strong secrets in `.env`.
  - Place a reverse proxy (nginx) in front of `frontend` and `backend` with TLS.

`DEPLOYMENT.md` includes example nginx and Let’s Encrypt configuration and a pre‑deployment checklist that covers:

- Generating strong `JWT_SECRET` and `POSTGRES_PASSWORD`.
- Restricting CORS to production domains.
- Configuring TLS termination.

### Kubernetes (Outline)

`DEPLOYMENT.md` outlines a Kubernetes deployment strategy that maps the containerized design into a cluster:

- `TENANTS/USERS/DEVICES` and all other tables still live in PostgreSQL.
- Postgres and Redis can be provided by:
  - Managed services (RDS, CloudSQL, ElastiCache), or
  - Helm charts (e.g. `bitnami/postgresql`, `bitnami/redis`).
- Backend and worker are deployed as separate Deployments:
  - Backend: FastAPI ASGI service.
  - Worker: Celery worker, possibly scaled separately.
- Frontend is served as a Deployment + Service or via static hosting (S3 + CloudFront) after building with the correct `VITE_API_BASE_URL`.

The repository does not include `k8s/` manifests; those are to be created following the patterns in `DEPLOYMENT.md` and `CI_CD.md`.

### Cloud‑Native (AWS Example)

`DEPLOYMENT.md` also describes an AWS‑centric architecture:

- RDS PostgreSQL instance for the database.
- ElastiCache for Redis.
- ECS/Fargate tasks for backend and worker.
- ALB for load balancing API traffic.
- S3 + CloudFront for serving the frontend build.
- Route 53 for DNS.

CI/CD pipelines described in [`../CI_CD.md`](../CI_CD.md) can be extended to:

- Build and push images to a registry.
- Trigger ECS service updates.
- Run database migrations via one‑off ECS tasks.

## Health and Readiness

Health checks are wired into docker‑compose:

- `db`: `pg_isready -U appuser -d myapp`.
- `redis`: `redis-cli ping`.
- `backend`: `curl -f http://localhost:8080/docs`.
- `frontend`: `wget --quiet --tries=1 --spider http://localhost:80`.

Within the application:

- `GET /health` returns `{"status": "ok"}` and is suitable as a liveness/readiness endpoint in Kubernetes or other orchestrators.
- `GET /docs` and `GET /openapi.json` provide evidence that the backend is running, routing is configured, and `Settings` has been loaded correctly.

## Database Migrations and Seeds

All schema, RLS, indexes, and seed data are driven by `DatabaseContainer/migrate.sh`. In docker‑compose, this script is executed by `db-migrate`:

- Writes `db_connection.txt` containing a `psql` connection command.
- Runs `./migrate.sh up` which sequentially:
  - Applies schema (`apply_schema`).
  - Applies RLS (`apply_rls`).
  - Applies indexes (`apply_indexes`).
  - Applies seed data (`apply_seeds`).

For manual or production migrations:

1. Ensure the target database exists and is reachable.
2. Place the correct connection string into `DatabaseContainer/db_connection.txt` (one line, e.g. `psql postgresql://appuser:...@host:5432/myapp`).
3. Run:

   ```bash
   cd DatabaseContainer
   chmod +x migrate.sh
   ./migrate.sh up
   ```

### Zero‑Downtime Considerations

`DEPLOYMENT.md` recommends:

- Testing migrations in staging before applying to production.
- Taking a database backup or snapshot before running migrations in production.
- Applying schema changes before deploying backend code that depends on them.
- Using blue‑green or rolling deployment strategies when disruptive schema changes are necessary.

## Configuration and Secrets

Configuration is detailed in `CONFIGURATION.md`. In deployment context:

- **Backend**:
  - Must have valid `DATABASE_URL`, `JWT_SECRET`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND`.
  - Should have `CORS_ORIGINS` set to production frontend domains.
- **Frontend**:
  - Must be built with correct `VITE_API_BASE_URL` pointing to the production backend.
- **Secrets**:
  - Should be managed via a secrets manager and injected as environment variables.
  - Should never be committed to source control.

`DEPLOYMENT.md` includes examples of using AWS Secrets Manager and cloud‑specific secret injection.

## CI/CD Integration

The CI/CD guide (`../CI_CD.md`) provides:

- GitHub Actions, GitLab CI, and Jenkins examples for:
  - Linting and testing backend and frontend.
  - Building and pushing Docker images.
  - Deploying to staging and production environments.
- Semantic release configuration for automated versioning and changelog generation.

In a typical workflow:

1. Changes are committed and pushed.
2. CI pipelines run lint, tests, and build artifacts/images.
3. Successful builds trigger tagging and/or deployments to staging.
4. Production deployments are triggered via tags (`vX.Y.Z`) or manual approvals.

It is important that deployment jobs also:

- Run migrations in a controlled manner (e.g. via ECS task, Kubernetes Job, or direct `migrate.sh` run).
- Execute smoke tests: `GET /health`, `GET /docs`, and minimal functional checks.

## Summary

Deployment of the Device Remote Management platform is grounded in:

- A clear container architecture described in `docker-compose.yml`.
- A robust, script‑driven database migration model in `DatabaseContainer/migrate.sh`.
- A configuration model based on environment variables and the backend `Settings` class.
- Rich deployment scenarios (local, single‑host Compose, Kubernetes, cloud) documented in `README.md`, `DOCKER.md`, and `DEPLOYMENT.md`.

Use this document as a starting point, then follow the linked top‑level docs for deeper, environment‑specific instructions. For day‑to‑day operational commands and troubleshooting, refer to `OPERATIONS_RUNBOOK.md`.
