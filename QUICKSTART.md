# Quick Start Guide

Get the Device Remote Management Platform running in 5 minutes.

## Prerequisites

- Docker 20.10+ with Docker Compose
- 4GB+ RAM available
- Ports 3000, 5000, 6379, 8080 free

## Steps

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Generate a secure JWT secret
openssl rand -hex 32
# Copy the output and update JWT_SECRET in .env
```

### 2. Start Services

```bash
# Option A: Use the start script
chmod +x start.sh
./start.sh

# Option B: Use docker-compose directly
docker-compose up -d
```

### 3. Verify Services

```bash
# Check status
docker-compose ps

# All services should show "Up" or "healthy"
```

### 4. Access Applications

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/docs
- **Default Login**: admin@example.com (change password on first login!)

## Troubleshooting

### Services not starting?

```bash
# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart backend
```

### Port conflicts?

Edit `.env` and change:
- `FRONTEND_PORT=3000` → `FRONTEND_PORT=3001`
- `BACKEND_PORT=8080` → `BACKEND_PORT=8081`
- `POSTGRES_EXTERNAL_PORT=5000` → `POSTGRES_EXTERNAL_PORT=5001`

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Database issues?

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

## Next Steps

1. Change default admin password
2. Create your first device
3. Configure protocol credentials (SNMP, WebPA, TR-069, USP)
4. Run your first query

See [README.md](README.md) for detailed documentation.
```
