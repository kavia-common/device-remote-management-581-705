# Docker Configuration Guide

## Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network (drm-network)          │
│                                                           │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐        │
│  │Frontend  │────>│ Backend  │────>│PostgreSQL│        │
│  │(nginx:80)│     │(API:8080)│     │(db:5432) │        │
│  └──────────┘     └────┬─────┘     └──────────┘        │
│                        │                                 │
│                        │            ┌──────────┐        │
│                        └───────────>│  Redis   │        │
│                        │            │(:6379)   │        │
│                   ┌────┴─────┐     └──────────┘        │
│                   │  Worker  │                          │
│                   │ (Celery) │                          │
│                   └──────────┘                          │
└─────────────────────────────────────────────────────────┘
```

## Service Details

### Database (PostgreSQL)

**Image**: `postgres:15-alpine`
**Container**: `drm-database`
**Port**: 5432 (internal), 5000 (external)
**Volumes**: `postgres_data:/var/lib/postgresql/data`

Environment variables:
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password

Health check: `pg_isready` every 10s

**Accessing database**:
```bash
# Via psql
docker-compose exec db psql -U appuser -d myapp

# Via port forwarding (from host)
psql postgresql://appuser:dbuser123@localhost:5000/myapp
```

### Redis

**Image**: `redis:7-alpine`
**Container**: `drm-redis`
**Port**: 6379 (internal and external)
**Volumes**: `redis_data:/data`

Command: `redis-server --appendonly yes` (persistence enabled)

Health check: `redis-cli ping` every 10s

**Accessing Redis**:
```bash
# Redis CLI
docker-compose exec redis redis-cli

# Check keys
docker-compose exec redis redis-cli KEYS '*'

# Monitor commands
docker-compose exec redis redis-cli MONITOR
```

### Database Migration Runner

**Image**: `postgres:15-alpine`
**Container**: `drm-db-migrate`
**Type**: One-time execution service

This service runs once on startup to:
1. Wait for database to be ready
2. Create `db_connection.txt`
3. Execute `migrate.sh up` (schema + RLS + indexes + seeds)
4. Exit with success

**Re-running migrations**:
```bash
docker-compose run --rm db-migrate
```

### Backend API

**Build Context**: `./BackendContainer`
**Container**: `drm-backend`
**Port**: 8080
**Volumes**: 
- `./BackendContainer/src:/app/src` (hot-reload in dev)
- `backend_uploads:/app/uploads`

Dependencies: db (healthy), redis (healthy), db-migrate (completed)

Health check: HTTP GET to `/docs` every 30s

**Development mode**:
```bash
# Rebuild after dependency changes
docker-compose build backend
docker-compose up -d backend

# View logs
docker-compose logs -f backend

# Access shell
docker-compose exec backend bash
```

### Celery Worker

**Build Context**: `./BackendContainer` (same as backend)
**Container**: `drm-worker`
**Command**: `celery -A src.celery_app.celery_app worker -l info -Q celery`
**Volumes**: Same as backend

No exposed ports (internal communication via Redis)

**Monitoring**:
```bash
# View worker logs
docker-compose logs -f worker

# Inspect active tasks
docker-compose exec worker celery -A src.celery_app.celery_app inspect active

# Inspect registered tasks
docker-compose exec worker celery -A src.celery_app.celery_app inspect registered

# Worker stats
docker-compose exec worker celery -A src.celery_app.celery_app inspect stats
```

**Scaling workers**:
```bash
# Run 3 worker instances
docker-compose up -d --scale worker=3

# Check all workers
docker-compose ps worker
```

### Frontend

**Build Context**: `./FrontendContainer`
**Container**: `drm-frontend`
**Port**: 80 (internal), 3000 (external)
**Build Args**: `VITE_API_BASE_URL`

Nginx serves static build from `/usr/share/nginx/html`

Health check: HTTP GET to `/` every 30s

**Rebuilding frontend**:
```bash
# After code changes
docker-compose build frontend
docker-compose up -d frontend

# Force rebuild (no cache)
docker-compose build --no-cache frontend
```

## Volumes

### postgres_data
Stores PostgreSQL data files. Persists across container restarts.

**Backup**:
```bash
docker-compose exec db pg_dump -U appuser myapp > backup_$(date +%Y%m%d).sql
```

**Restore**:
```bash
docker-compose exec -T db psql -U appuser myapp < backup_20231218.sql
```

### redis_data
Stores Redis AOF (append-only file) for persistence.

### backend_uploads
Stores uploaded MIB files and other user uploads.

**Cleaning**:
```bash
docker-compose down
docker volume rm device-remote-management-581-705_backend_uploads
```

## Network

**Name**: `drm-network`
**Driver**: bridge

All services communicate via this network using service names as hostnames:
- `db` → PostgreSQL
- `redis` → Redis
- `backend` → Backend API
- `frontend` → Frontend

## Environment Variables

See [README.md](README.md) for full list.

### Build-time vs Runtime

**Build-time** (Frontend):
- `VITE_API_BASE_URL` - baked into frontend build

**Runtime** (Backend, Worker):
- `DATABASE_URL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `JWT_SECRET`
- `CORS_ORIGINS`

## Common Operations

### Start all services
```bash
docker-compose up -d
```

### Stop all services
```bash
docker-compose down
```

### Stop and remove volumes (full reset)
```bash
docker-compose down -v
```

### Rebuild specific service
```bash
docker-compose build backend
docker-compose up -d backend
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend bash

# Database shell
docker-compose exec db psql -U appuser -d myapp

# Redis CLI
docker-compose exec redis redis-cli

# Worker Celery inspect
docker-compose exec worker celery -A src.celery_app.celery_app inspect active
```

### Resource usage
```bash
# Stats for all containers
docker stats

# Specific container
docker stats drm-backend
```

### Cleanup unused resources
```bash
# Remove stopped containers
docker-compose down

# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION: may delete data)
docker volume prune
```

## Production Considerations

### Security

1. **Never expose database port externally** in production
   - Remove port mapping in docker-compose.yml: `# - "5000:5432"`

2. **Use secrets management**
   - Store secrets in Docker secrets or external vault
   - Never commit `.env` file

3. **Run as non-root**
   - Add `user: "1000:1000"` to service definitions

4. **Enable TLS**
   - Use reverse proxy (nginx, Traefik) for SSL termination
   - Obtain certificates from Let's Encrypt

### Performance

1. **Resource limits**
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
           reservations:
             memory: 512M
   ```

2. **Connection pooling**
   - Configure SQLAlchemy pool size
   - Limit max connections in PostgreSQL

3. **Caching**
   - Use Redis for application caching
   - Enable nginx caching for static assets

### High Availability

1. **External managed services**
   - Use managed PostgreSQL (RDS, CloudSQL, etc.)
   - Use managed Redis (ElastiCache, etc.)

2. **Container orchestration**
   - Deploy with Kubernetes or ECS
   - Auto-scaling for workers

3. **Load balancing**
   - Multiple backend instances
   - Health check endpoints
   - Session affinity if needed

### Monitoring

1. **Logging**
   - Centralized logging (ELK, Loki, CloudWatch)
   - Structured JSON logs

2. **Metrics**
   - Prometheus exporters
   - Grafana dashboards

3. **Alerting**
   - Health check failures
   - Resource exhaustion
   - Error rate spikes

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs <service-name>

# Check container status
docker-compose ps

# Inspect container
docker inspect drm-backend
```

### Database connection refused

```bash
# Check if db is healthy
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection from backend
docker-compose exec backend bash -c "nc -zv db 5432"
```

### Redis connection issues

```bash
# Check Redis
docker-compose ps redis
docker-compose exec redis redis-cli ping

# Test from backend
docker-compose exec backend bash -c "nc -zv redis 6379"
```

### Port already in use

```bash
# Find process using port
lsof -i :8080

# Change port in .env
BACKEND_PORT=8081

# Restart
docker-compose down
docker-compose up -d
```

### Out of disk space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

## Development Tips

### Hot reload

Backend and worker have source mounted as volumes - changes reflect immediately.

Frontend requires rebuild after changes.

### Debugging

```bash
# Backend with breakpoint support
docker-compose stop backend
docker-compose run --rm --service-ports backend python -m pdb src/main.py

# View all environment variables
docker-compose exec backend env
```

### Testing

```bash
# Run backend tests in container
docker-compose exec backend pytest

# Run with coverage
docker-compose exec backend pytest --cov=src tests/
```
