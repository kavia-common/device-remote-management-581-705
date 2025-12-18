# Documentation Index

## Overview

This `docs` directory contains architecture and design documentation for the Device Remote Management platform. The goal of these documents is to give engineers, operators, and automation tools a clear understanding of how the system is structured, how its components interact, and how to operate and extend it safely.

All documentation is based on the actual implementation in this repository, including:

- BackendContainer (FastAPI backend with Celery workers)
- FrontendContainer (React + TypeScript SPA)
- DatabaseContainer (PostgreSQL schema, RLS, and migrations)
- Docker Compose orchestration and deployment guides

## Document Map

### System and Architecture

- [ARCHITECTURE.md](./ARCHITECTURE.md)  
  High‑level architecture of the platform, system goals, main components, protocol support, observability, and known limitations.

- [SYSTEM_CONTEXT.md](./SYSTEM_CONTEXT.md)  
  System context and interaction with external actors such as operators, managed devices, ACS/USP controllers, and infrastructure services.

- [CONTAINERS.md](./CONTAINERS.md)  
  Container and service architecture derived from `docker-compose.yml`, including responsibilities, ports, dependencies, and health checks.

### Data and Persistence

- [DATA_MODEL.md](./DATA_MODEL.md)  
  Database schema overview with an ERD in Mermaid, descriptions of core tables, Row Level Security (RLS) policies, and key indexes.

### APIs and Background Processing

- [API_REFERENCE.md](./API_REFERENCE.md)  
  Concise catalog of implemented backend API endpoints (auth, tenants, users, devices, jobs/events, MIB, TR‑181) with example requests and responses.

- [ASYNC_JOBS.md](./ASYNC_JOBS.md)  
  Design of the asynchronous job system using Celery and Redis, including job lifecycle, data flow, and Server‑Sent Events (SSE) progress streaming.

### Security, Configuration, and Deployment

- [SECURITY.md](./SECURITY.md)  
  Security model for authentication, JWTs, multi‑tenant isolation (RLS), RBAC tables, SSE security considerations, and secrets handling.

- [CONFIGURATION.md](./CONFIGURATION.md)  
  Configuration and environment variables at the root, backend, and frontend levels, including protocol defaults and Celery settings.

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)  
  High‑level deployment guide that ties together `README.md`, `DOCKER.md`, and `DEPLOYMENT.md`, with pointers for local, Docker Compose, and production deployments.

### Operations and Release Management

- [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)  
  Operational procedures for starting and stopping services, running migrations and seeds, managing jobs and workers, and troubleshooting common issues.

- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)  
  Structured checklist for preparing, executing, and validating releases, aligned with the CI/CD guidance in `CI_CD.md` and the deployment documentation.

## How to Use These Documents

1. **New contributors** should start with `ARCHITECTURE.md` and `SYSTEM_CONTEXT.md` to understand the big picture, then read `CONTAINERS.md` and `DATA_MODEL.md` to learn how services and data are organized.
2. **Backend and protocol engineers** should focus on `API_REFERENCE.md`, `ASYNC_JOBS.md`, `DATA_MODEL.md`, and `SECURITY.md` when extending APIs or background tasks.
3. **Frontend engineers** can use `SYSTEM_CONTEXT.md`, `ARCHITECTURE.md`, and `API_REFERENCE.md` to understand backend capabilities and constraints.
4. **SREs and operators** should rely on `DEPLOYMENT_GUIDE.md`, `OPERATIONS_RUNBOOK.md`, `CONFIGURATION.md`, and `RELEASE_CHECKLIST.md` for deployments, incident response, and releases.

All documents are intended to stay in sync with the codebase; when you make significant changes to APIs, schemas, or deployment topology, please update the corresponding markdown files in this directory.
