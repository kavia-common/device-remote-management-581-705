# Release Checklist

## Purpose

This checklist standardizes how releases of the Device Remote Management platform are prepared, executed, and verified. It brings together best practices from:

- CI/CD configuration (`../CI_CD.md`)
- Deployment guidance (`../DEPLOYMENT.md`)
- Docker and runtime documentation (`../DOCKER.md`, `../README.md`)
- Database migration script (`DatabaseContainer/migrate.sh`)

The checklist is structured into three phases:

1. Pre‑release (development and staging).
2. Deployment (staging and production).
3. Post‑release verification and monitoring.

## 1. Pre‑Release

### 1.1 Code and Documentation Readiness

Before cutting a release:

- Ensure all relevant features and bug fixes are merged into the main release branch.
- Confirm that:
  - Backend APIs are fully implemented and documented in `docs/API_REFERENCE.md`.
  - Any schema or RLS changes are planned and implemented in `DatabaseContainer/migrate.sh`.
  - Architecture and data model updates are reflected in:
    - `docs/ARCHITECTURE.md`
    - `docs/DATA_MODEL.md`
    - `docs/ASYNC_JOBS.md`
    - `docs/SECURITY.md`
- Review the changelog or release notes (if using semantic‑release, see `.releaserc.json` in `../CI_CD.md`).

### 1.2 Automated Testing

Run the full test and lint suite locally or via CI:

- **Backend** (from `BackendContainer`):

  ```bash
  # Install dependencies if not already done
  pip install -e .
  pip install pytest pytest-cov pytest-asyncio

  # Lint and format checks (if configured)
  ruff check src/
  black --check src/

  # Run tests with coverage
  pytest tests/ --cov=src --cov-report=term --cov-report=xml
  ```

- **Frontend** (from `FrontendContainer`):

  ```bash
  npm install

  npm run lint
  npm run typecheck
  npm run build
  ```

- Verify that CI pipelines (GitHub Actions, GitLab CI, or Jenkins) defined in `../CI_CD.md` are green for the release commit.

### 1.3 Schema and Migration Validation

If there are database changes:

- Review modifications in `DatabaseContainer/migrate.sh`:
  - New tables or columns.
  - RLS policy adjustments.
  - Index additions/changes.
- In a staging or local environment:
  - Run migrations end‑to‑end:

    ```bash
    cd DatabaseContainer
    ./migrate.sh up
    ```

  - Verify that application features dependent on the schema work as expected.
  - Confirm no destructive changes break existing tenants or data (unless part of a coordinated migration plan).

### 1.4 Configuration Review

Ensure configuration is ready for the target environment:

- Confirm `.env` or secret values for staging and production:
  - `JWT_SECRET` is strong and not a development placeholder.
  - `POSTGRES_PASSWORD` is strong.
  - `CORS_ORIGINS` contains the correct staging/production frontend domains.
  - `VITE_API_BASE_URL` is set to the correct backend URL before building the frontend.
  - `ENABLE_SSE` is set appropriately (usually `true`).
- For cloud environments, confirm that secrets in the secrets manager match your expectations.

## 2. Deployment

### 2.1 Tagging and Versioning

Use a consistent versioning scheme (e.g. semantic versioning):

- If using semantic‑release (see `.releaserc.json` in `../CI_CD.md`):
  - Ensure commit messages follow the expected conventions (`feat:`, `fix:`, etc.).
  - Allow the release automation to generate tags and changelogs.
- Otherwise:
  - Create an annotated tag:

    ```bash
    git tag -a vX.Y.Z -m "Release vX.Y.Z"
    git push origin vX.Y.Z
    ```

  - Ensure CI pipelines configured in `../CI_CD.md` trigger the appropriate build and deployment jobs.

### 2.2 Staging Deployment

Before touching production:

- Deploy to staging using the CI pipeline described in `../CI_CD.md` (e.g., GitHub Actions `Deploy to Staging`, GitLab `deploy:staging`, Jenkins pipeline).
- Run migrations in staging:
  - Via the same mechanism you will use in production (e.g., ECS task, Kubernetes Job, or `db-migrate` container).
- Run smoke tests:

  - Health checks:

    ```bash
    curl -f https://api-staging.example.com/health
    curl -f https://api-staging.example.com/docs
    curl -f https://staging.example.com/
    ```

  - Core flows:
    - Login via the frontend.
    - Create a device and verify it appears in the device list.
    - Enqueue a demo job (SNMP/WebPA/TR‑069/USP) and confirm it transitions from `queued` to `running` to `completed/failed`.
    - Upload a MIB file and browse its OIDs in the MIB browser.
    - Load the TR‑181 browser and verify parameters populate.

Fix any issues discovered in staging before proceeding.

### 2.3 Production Deployment

When ready to deploy to production:

1. **Backups / Snapshots**
   - Take a database snapshot or full backup as recommended in `../DEPLOYMENT.md`.
   - Verify backups are recent and restorable.

2. **Migrations**
   - Run `DatabaseContainer/migrate.sh up` or equivalent migration job against production:
     - Ensure the `db_connection.txt` or connection configuration points to the correct production database.
   - Monitor for errors; if migrations fail, investigate and resolve before proceeding.

3. **Application Rollout**
   - Use the CI/CD pipeline to:
     - Build and push images for backend, worker, and frontend.
     - Update services (ECS, Kubernetes, or docker‑compose on the production host).
   - Ensure:
     - Backend pods/containers start and pass health checks.
     - Worker pods/containers connect to Redis and the database.
     - Frontend is updated and serving the new build.

4. **Post‑deploy Smoke Tests**
   - Repeat the same health and core flow checks as in staging, but against the production URLs.
   - Confirm:
     - `/health`, `/docs`, and `/openapi.json` return successfully.
     - The SPA loads correctly and uses the correct API base URL.
     - Key multi‑tenant flows (login, device listing, job enqueue, MIB/TR‑181 browsing) function as expected.

5. **Communication**
   - Notify relevant stakeholders (NOC, support, product owners) that the release has been deployed and initial validation is complete.

## 3. Post‑Release Verification and Monitoring

### 3.1 Application and Infrastructure Monitoring

After deployment:

- Monitor:

  - Backend and worker logs (for errors and unexpected traces).
  - Database metrics (connections, CPU, IO, long‑running queries).
  - Redis metrics (memory usage, connection counts, latency).
  - Container or node metrics (CPU, memory, disk usage).

- Use the recommendations in `../DEPLOYMENT.md` for:
  - Log aggregation (ELK, Loki, CloudWatch, etc.).
  - Metrics (Prometheus + Grafana or cloud‑native equivalents).
  - Alerts (service down, high error rates, queue backlog).

Pay particular attention to:

- HTTP 5xx rates and exceptions in backend logs.
- Celery queue depth and worker throughput.
- Job statuses in the `jobs` table (`failed` spikes, stuck `running` jobs).

### 3.2 Data Integrity Checks

Perform targeted data checks:

- List a small sample of tenants, users, and devices from the database.
- Inspect new schema elements introduced by the release.
- Confirm that any RLS changes behave as expected (no cross‑tenant data leakage).

### 3.3 Rollback Plan

If critical issues are discovered:

1. **Application Rollback**
   - Revert backend and frontend to the previous known‑good image/tag using your CI/CD pipeline or orchestration tool.
   - Confirm that old code is compatible with the current database schema.

2. **Database Rollback**
   - If schema or data regressions are severe and cannot be mitigated:
     - Restore from the pre‑deployment snapshot or backup following the steps in `../DEPLOYMENT.md`.
     - Be aware that this may discard data created after the snapshot.

3. **Communication**
   - Clearly communicate the rollback to stakeholders, including:
     - User impact.
     - Expected recovery time.
     - Mitigation steps and follow‑up actions.

## 4. Release Artifacts and Documentation

After a successful release:

- Update any human‑readable release notes (if not managed by semantic‑release) to include:
  - Features added.
  - Bugs fixed.
  - Schema changes.
  - Operational and security considerations.
- Ensure that:
  - `docs/` remains in sync with the deployed code (especially `API_REFERENCE.md`, `ARCHITECTURE.md`, and `DATA_MODEL.md`).
  - CI/CD configurations (`../CI_CD.md`) and deployment guides (`../DEPLOYMENT.md`, `../DOCKER.md`) are still accurate.

## Summary

This checklist is designed to be practical and grounded in the actual structure of the repository:

- It ties directly into existing scripts (`migrate.sh`, ops scripts), docker‑compose configuration, and CI/CD pipelines.
- It emphasizes safe handling of migrations, thorough testing, and careful verification in both staging and production.

Teams should adapt and extend this checklist to fit their processes, but it should serve as a reliable baseline for consistent, low‑risk releases of the Device Remote Management platform.
