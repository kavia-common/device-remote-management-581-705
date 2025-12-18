# Operations Runbook

## Overview

This runbook is intended for operators and SREs responsible for running the Device Remote Management platform in development, staging, or production environments. It covers:

- Starting, stopping, and monitoring services.
- Managing database migrations and seed data.
- Working with Celery workers and jobs.
- Running demo flows for validation.
- Performing backups and restores.
- Troubleshooting common issues.

All procedures are based on the existing code and scripts:

- `docker-compose.yml`
- `DatabaseContainer/migrate.sh` and `DatabaseContainer/seed_demo.sh`
- Backend ops scripts in `BackendContainer/src/ops/`
- Deployment and Docker docs in `../DEPLOYMENT.md` and `../DOCKER.md`

Unless stated otherwise, commands assume you are in the `device-remote-management-581-705` directory and using Docker Compose.

## Service Lifecycle

### Start All Services

To start the full stack:

```bash
docker-compose up -d
```

This will:

1. Start PostgreSQL (`db`) and Redis (`redis`).
2. Run `db-migrate` to initialize schema, RLS, indexes, and seeds.
3. Start `backend` and `worker`.
4. Start `frontend`.

Verify status:

```bash
docker-compose ps
```

All services should be in `Up` or `healthy` state.

### Stop All Services

To stop all containers without removing volumes:

```bash
docker-compose down
```

To stop and remove volumes (reset database and Redis data):

```bash
docker-compose down -v
```

Be cautious: removing volumes erases all data.

### Restart Individual Services

You can restart any single service:

```bash
docker-compose restart backend
docker-compose restart worker
docker-compose restart frontend
```

If a container is failing due to a transient error, `docker-compose restart` will often resolve it after configuration or dependency issues are fixed.

## Health Checks and Monitoring

### Application Health Endpoints

- Backend liveness/readiness:
  - `GET http://localhost:${BACKEND_PORT:-8080}/health` → `{"status":"ok"}`
- Backend docs:
  - `GET /docs` and `GET /redoc` to confirm OpenAPI is served.
- Frontend:
  - `GET http://localhost:${FRONTEND_PORT:-3000}/` should return the React SPA.

These endpoints can be used by external monitoring services or orchestrators (e.g. Kubernetes, ECS) to assess service health.

### Container Health Checks

Docker Compose uses built‑in health checks:

- `db`: `pg_isready -U appuser -d myapp`
- `redis`: `redis-cli ping`
- `backend`: `curl -f http://localhost:8080/docs`
- `frontend`: `wget --quiet --tries=1 --spider http://localhost:80`

View health status:

```bash
docker-compose ps
```

If a service repeatedly restarts, inspect its logs:

```bash
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f db
docker-compose logs -f redis
docker-compose logs -f frontend
```

## Database Operations

### Running Migrations Manually

In most cases, the `db-migrate` container runs migrations automatically on startup. If you need to re‑apply or run them manually (e.g., in a non‑Compose environment):

1. Ensure PostgreSQL is running and reachable.
2. Set `db_connection.txt` with a single `psql` command, such as:

   ```text
   psql postgresql://appuser:dbuser123@localhost:5000/myapp
   ```

3. Run the migration script:

   ```bash
   cd DatabaseContainer
   chmod +x migrate.sh
   ./migrate.sh up
   ```

You can run specific phases:

- Schema only:

  ```bash
  ./migrate.sh schema
  ```

- RLS only:

  ```bash
  ./migrate.sh rls
  ```

- Indexes only:

  ```bash
  ./migrate.sh indexes
  ```

- Seeds only:

  ```bash
  ./migrate.sh seeds
  ```

### Seeding Demo Data

In a docker‑compose environment, you can re‑seed demo data via `db-migrate`:

```bash
docker-compose exec db-migrate sh -c "cd /workspace && ./migrate.sh seeds"
```

Alternatively, run `DatabaseContainer/seed_demo.sh` if present and documented in `DatabaseContainer/README.md`.

Demo seed data includes:

- A demo tenant.
- An admin user (e.g. `admin@example.com` or `demoadmin@example.com`).
- A sample device (`Router-01` or `localhost-snmp`).
- SNMP credentials and a device protocol profile.
- Example MIB and TR‑181 entries.
- An example job and job result.

### Backups and Restores

From `../README.md` and `../DOCKER.md`, example backup and restore commands:

- Backup:

  ```bash
  docker-compose exec db pg_dump -U appuser myapp > backup_$(date +%Y%m%d).sql
  ```

- Restore:

  ```bash
  docker-compose exec -T db psql -U appuser myapp < backup_YYYYMMDD.sql
  ```

For production, follow the backup and retention policies outlined in `../DEPLOYMENT.md` and your organization’s database standards.

## Celery Worker and Job Management

### Checking Worker Status

View worker logs:

```bash
docker-compose logs -f worker
```

If jobs are not being processed:

1. Ensure `redis` is healthy:

   ```bash
   docker-compose exec redis redis-cli ping
   ```

2. Ensure `db` is healthy:

   ```bash
   docker-compose exec db pg_isready -U appuser -d myapp
   ```

3. Restart the worker:

   ```bash
   docker-compose restart worker
   ```

### Scaling Workers

To increase job throughput, scale the `worker` service:

```bash
docker-compose up -d --scale worker=3
docker-compose ps worker
```

Each worker will run the same Celery app defined in `BackendContainer/src/celery_app.py` and consume tasks from Redis.

### Inspecting Jobs

The backend implements job enqueue endpoints and SSE for monitoring but does not yet expose a `GET /jobs` API. For operational inspection:

- Query jobs directly in the database:

  ```bash
  docker-compose exec db psql -U appuser -d myapp -c \
    "SELECT id, kind, status, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT 20;"
  ```

- Inspect job results:

  ```bash
  docker-compose exec db psql -U appuser -d myapp -c \
    "SELECT job_id, result FROM job_results ORDER BY created_at DESC LIMIT 10;"
  ```

- Tail Celery logs to observe protocol‑level errors:

  ```bash
  docker-compose logs -f worker
  ```

### SSE Progress Monitoring

The frontend uses the SSE endpoint `GET /jobs/events/{job_id}` to receive status updates. From an operator’s perspective:

- Verify that `ENABLE_SSE=true` in the backend configuration (`.env` or environment).
- Confirm the endpoint responds:

  ```bash
  curl -N "http://localhost:8080/jobs/events/<job-id>"
  ```

If SSE is disabled, the endpoint returns `404`.

## Demo Flows and Validation

The backend includes operational scripts in `BackendContainer/src/ops/` to demonstrate end‑to‑end flows.

### Seed Demo Context and Enqueue SNMP Job

Inside the backend container:

```bash
docker-compose exec backend python -m src.ops.seed_demo
```

This script:

1. Ensures demo seed data (tenant, user, device, SNMP credentials) exist.
2. Creates and enqueues an SNMP GET job for OID `1.3.6.1.2.1.1.1.0` (sysDescr).
3. Prints the job id and instructions for monitoring.

Alternatively, you can run:

```bash
docker-compose exec backend python -m src.ops.run_demo_snmp
```

This focuses on enqueuing a demo SNMP job using existing demo data.

To monitor:

```bash
# Replace JOB_ID with the printed value
curl http://localhost:8080/jobs/events/JOB_ID
```

Even if no SNMP agent is running on the target IP/port, this flow validates:

- API to Celery hand‑off.
- Celery execution and error handling.
- Job status updates and job_results writing.
- SSE progress reporting.

## Logs and Diagnostics

### Viewing Logs

Use docker‑compose logs for each service:

```bash
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f db
docker-compose logs -f redis
docker-compose logs -f frontend
```

For a quick snapshot:

```bash
docker-compose logs --tail=100 backend
```

In production, as described in `../DEPLOYMENT.md`, you should integrate with centralized logging and adjust log levels (e.g., `LOG_LEVEL=WARNING` via environment).

### Common Issues and Remedies

1. **Backend fails to start (database errors)**  
   - Check `DATABASE_URL` and connectivity to `db`.
   - Confirm migrations ran successfully (`db-migrate` logs).
   - Examine `backend` logs for stack traces.

2. **Worker not processing jobs**
   - Verify `redis` health (`redis-cli ping`).
   - Check `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` match in `backend` and `worker`.
   - Ensure job enqueue endpoints returned `202` and not `401` (tenant/user context required).

3. **Frontend cannot reach backend**
   - Confirm `VITE_API_BASE_URL` and CORS configuration (`CORS_ORIGINS`) are aligned.
   - Check `backend` health (`/health` and `/docs`).
   - Look at browser console for CORS or network errors.

4. **SSE not working in browser**
   - Confirm `ENABLE_SSE=true`.
   - Check that the frontend is pointing to the correct SSE URL via `getSSEUrl`.
   - Be aware that the backend currently uses the `Authorization` header for auth, while the frontend’s `useSSE` passes the token as a query parameter; this mismatch may require backend changes.

5. **Port conflicts**
   - Modify ports in root `.env`:

     ```env
     POSTGRES_EXTERNAL_PORT=5001
     REDIS_EXTERNAL_PORT=6380
     BACKEND_PORT=8081
     FRONTEND_PORT=3001
     ```

   - Restart:

     ```bash
     docker-compose down
     docker-compose up -d
     ```

## Backup, Restore, and Disaster Recovery

For development and simple deployments, manual `pg_dump`/`psql` workflows are sufficient (see above). For production:

- Follow the backup schedules and retention policies described in `../DEPLOYMENT.md`.
- Use managed database snapshots where possible (e.g., RDS snapshots before applying migrations).
- Document and test recovery procedures, including:
  - Restoring database from backup.
  - Redeploying containers or tasks.
  - Verifying application health and data integrity after restore.

## Upgrades and Releases

Upgrade and release procedures are covered in `RELEASE_CHECKLIST.md` and `../CI_CD.md`. Operationally:

- Plan maintenance windows for schema‑affecting releases.
- Ensure a backup or snapshot is taken prior to running migrations.
- Monitor logs, health endpoints, and key metrics during and after the deployment.
- Keep a rollback strategy ready (e.g., rolling back images and restoring database snapshots).

## Summary

Operational management of the Device Remote Management platform centers around:

- Docker Compose for service orchestration.
- Scripted migrations and seeds via `DatabaseContainer/migrate.sh`.
- Celery workers and Redis for background jobs.
- Health checks and logs for monitoring and troubleshooting.

Use this runbook as a quick reference for day‑to‑day tasks, and refer to `../DOCKER.md`, `../DEPLOYMENT.md`, `SECURITY.md`, and `RELEASE_CHECKLIST.md` for deeper operational and security considerations.
