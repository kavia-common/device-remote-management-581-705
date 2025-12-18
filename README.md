# Device Remote Management Platform

A comprehensive multi-protocol device management platform providing a unified web-based interface for managing network devices through SNMP (v2/v3), WebPA, TR69/ACS, and TR369/USP protocols.

## Architecture

This repository contains multiple containers orchestrated via Docker Compose:

- **DatabaseContainer**: PostgreSQL 15 with RLS-enabled schema, migrations, and seed data
- **BackendContainer**: FastAPI backend with async PostgreSQL, JWT auth, Celery task queue
- **FrontendContainer**: React + TypeScript (Vite) with modern UI/UX
- **Redis**: Message broker and result backend for Celery
- **Worker**: Celery worker for background task processing

## Quick Start

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- 4GB+ available memory
- Ports 3000, 5000, 6379, 8080 available

### 1. Clone and Configure

```bash
# Clone the repository
cd device-remote-management-581-705

# Copy environment template
cp .env.example .env

# Edit .env and update these critical values:
# - JWT_SECRET: Generate with: openssl rand -hex 32
# - POSTGRES_PASSWORD: Use a strong password for production
# - CORS_ORIGINS: Add your deployment domains
```

### 2. Start All Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8080/docs
- **Backend ReDoc**: http://localhost:8080/redoc
- **OpenAPI Spec**: http://localhost:8080/openapi.json

### 4. Default Credentials

The database is seeded with a default admin account:

- **Email**: admin@example.com
- **Password**: Use the demo password or configure during first login

⚠️ **Security Warning**: Change the default admin password immediately in production!

## Environment Variables

### Root Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `myapp` |
| `POSTGRES_USER` | Database user | `appuser` |
| `POSTGRES_PASSWORD` | Database password | `dbuser123` |
| `POSTGRES_EXTERNAL_PORT` | External DB port | `5000` |
| `REDIS_EXTERNAL_PORT` | External Redis port | `6379` |
| `BACKEND_PORT` | Backend API port | `8080` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `JWT_SECRET` | JWT signing secret | **Must change!** |
| `JWT_EXPIRES_IN` | JWT expiration (seconds) | `3600` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `ENABLE_SSE` | Enable Server-Sent Events | `true` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:8080` |

### Backend-Specific (.env in BackendContainer)

See `BackendContainer/.env.example` for detailed backend configuration including:
- `DATABASE_URL`: Full PostgreSQL connection string
- `CELERY_BROKER_URL`: Redis broker URL
- `CELERY_RESULT_BACKEND`: Redis result backend URL

### Frontend-Specific (.env in FrontendContainer)

See `FrontendContainer/.env.example` for frontend configuration including:
- `VITE_API_BASE_URL`: Backend API endpoint
- Optional OIDC/SSO settings

## Container Details

### DatabaseContainer

PostgreSQL database with:
- Row Level Security (RLS) for multi-tenant isolation
- Automated migrations via `migrate.sh`
- Seed data with default tenant and admin user
- Comprehensive indexes for performance

**Manual Operations:**

```bash
# Access database shell
docker-compose exec db psql -U appuser -d myapp

# Run migrations manually
docker-compose exec db-migrate sh -c "cd /workspace && ./migrate.sh up"

# Apply only schema
docker-compose exec db-migrate sh -c "cd /workspace && ./migrate.sh schema"

# Apply only seeds
docker-compose exec db-migrate sh -c "cd /workspace && ./migrate.sh seeds"
```

See `DatabaseContainer/README.md` for detailed schema information.

### BackendContainer

FastAPI backend providing:
- RESTful APIs for device management
- JWT-based authentication
- Multi-tenant RLS context middleware
- MIB parsing and TR-181 catalog management
- Async job processing via Celery
- OpenAPI/Swagger documentation

**Development Mode:**

```bash
# Start backend with hot-reload
cd BackendContainer
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
```

See `BackendContainer/README.md` for API details.

### Worker (Celery)

Background task processor for:
- SNMP queries (v2c, v3)
- WebPA operations
- TR-069/ACS commands
- USP/TR-369 operations
- MIB file parsing

**Monitoring:**

```bash
# View worker logs
docker-compose logs -f worker

# Restart worker
docker-compose restart worker
```

### FrontendContainer

React + TypeScript SPA with:
- Modern UI components
- Device management interface
- Protocol selector and query forms
- MIB and TR-181 browsers
- Real-time job status updates
- Multi-tenant support

**Development Mode:**

```bash
# Start frontend dev server
cd FrontendContainer
npm install
npm run dev
# Access at http://localhost:5173
```

See `FrontendContainer/README.md` for details.

## Service Dependencies

The docker-compose configuration ensures proper startup order:

1. **db** (PostgreSQL) - starts first
2. **redis** - starts in parallel with db
3. **db-migrate** - runs after db is healthy
4. **backend** - starts after db, redis, and migrations complete
5. **worker** - starts after db, redis, and migrations complete
6. **frontend** - starts after backend is healthy

## Health Checks

All services include health checks:

- **db**: `pg_isready` check every 10s
- **redis**: `redis-cli ping` every 10s
- **backend**: HTTP check on `/docs` every 30s
- **frontend**: HTTP check on `/` every 30s

## Common Operations

### Seed Demo Data

To seed the database with demo tenant, user, and device:

```bash
# Run database seed script
docker-compose exec db-migrate sh -c "cd /workspace && ./seed_demo.sh"
```

This creates:
- Demo tenant (DemoTenant)
- Demo admin user (demoadmin@example.com)
- Sample device (localhost-snmp at 127.0.0.1)
- SNMP v2c credential (demo-public-v2c, community=public, port=161)

### Run Demo SNMP Job

After seeding, trigger a demo SNMP GET job:

```bash
# Run demo job script
docker-compose exec backend python -m src.ops.run_demo_snmp
```

This enqueues an SNMP GET job for OID 1.3.6.1.2.1.1.1.0 (sysDescr) and prints instructions for monitoring.

Monitor the job:
```bash
# Get job status
curl http://localhost:8080/jobs/{job_id}

# Watch real-time progress via SSE
curl -N http://localhost:8080/jobs/events/{job_id}
```

**Note**: The Celery worker must be running. If no SNMP agent is on localhost:161, the job will fail but demonstrates the complete workflow.

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove Volumes (Reset Database)

```bash
docker-compose down -v
```

### Rebuild Services

```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f worker
```

### Scale Workers

```bash
# Run multiple worker instances
docker-compose up -d --scale worker=3
```

### Database Backup

```bash
# Backup database
docker-compose exec db pg_dump -U appuser myapp > backup.sql

# Restore database
docker-compose exec -T db psql -U appuser myapp < backup.sql
```

## Development Workflow

### Local Development (without Docker)

1. **Start Database and Redis:**
   ```bash
   docker-compose up -d db redis
   ```

2. **Run Backend Locally:**
   ```bash
   cd BackendContainer
   pip install -e .
   # Update .env with DATABASE_URL pointing to localhost:5000
   uvicorn src.main:app --reload --host 0.0.0.0 --port 8080
   ```

3. **Run Worker Locally:**
   ```bash
   cd BackendContainer
   celery -A src.celery_app.celery_app worker -l info -Q celery
   ```

4. **Run Frontend Locally:**
   ```bash
   cd FrontendContainer
   npm install
   npm run dev
   ```

### Production Deployment

1. **Update Environment Variables:**
   - Generate strong `JWT_SECRET`
   - Use strong `POSTGRES_PASSWORD`
   - Update `CORS_ORIGINS` with production domains
   - Set `VITE_API_BASE_URL` to production backend URL

2. **Enable SSL/TLS:**
   - Configure reverse proxy (nginx, Traefik, etc.)
   - Obtain SSL certificates (Let's Encrypt recommended)
   - Update CORS origins to use `https://`

3. **Database Considerations:**
   - Use managed PostgreSQL service for production
   - Enable automated backups
   - Configure connection pooling
   - Set up monitoring and alerts

4. **Scale Services:**
   - Run multiple worker instances
   - Use container orchestration (Kubernetes, ECS, etc.)
   - Configure load balancing

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test connection
docker-compose exec db psql -U appuser -d myapp -c "SELECT 1;"
```

### Backend Not Starting

```bash
# Check backend logs
docker-compose logs backend

# Verify environment variables
docker-compose exec backend env | grep DATABASE_URL

# Restart backend
docker-compose restart backend
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs worker

# Verify Redis connection
docker-compose exec redis redis-cli ping

# Check Celery queue
docker-compose exec worker celery -A src.celery_app.celery_app inspect active
```

### Frontend Build Errors

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Port Conflicts

If ports are already in use, update `.env`:

```env
POSTGRES_EXTERNAL_PORT=5001
REDIS_EXTERNAL_PORT=6380
BACKEND_PORT=8081
FRONTEND_PORT=3001
```

Then restart services:

```bash
docker-compose down
docker-compose up -d
```

## Security Considerations

- **Change default credentials** immediately
- **Generate strong JWT_SECRET**: `openssl rand -hex 32`
- **Use strong database passwords**
- **Enable SSL/TLS in production**
- **Regularly update dependencies** and base images
- **Implement rate limiting** on API endpoints
- **Configure firewall rules** to restrict database/redis access
- **Enable audit logging** for compliance
- **Regular security audits** and penetration testing

## License

[Your License Here]

## Support

For issues, questions, or contributions:
- Open an issue in the repository
- Contact the development team
- Review component-specific READMEs for detailed documentation
