# Deployment Guide - Device Remote Management Platform

This guide covers deployment options for the Device Remote Management Platform in various environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Environment Configuration](#environment-configuration)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

**For Docker Deployment:**
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space

**For Manual Deployment:**
- Node.js 18+
- PostgreSQL 15+
- 2GB RAM minimum
- 10GB disk space

### Development Deployment (Docker Compose)

1. **Clone and navigate:**
   ```bash
   cd device-remote-management-581-705
   ```

2. **Review and configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed (optional for dev)
   ```

3. **Start all services:**
   ```bash
   docker compose up -d
   ```

4. **Verify services are healthy:**
   ```bash
   docker compose ps
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/health
   - Database: localhost:5001

6. **View logs:**
   ```bash
   docker compose logs -f
   ```

## Docker Compose Deployment

### Service Architecture

```yaml
services:
  database:   # PostgreSQL 15 on port 5001
  backend:    # Node.js/Express on port 3000
  frontend:   # React/Vite on port 5173 (dev) / 80 (prod)
```

### Starting Services

```bash
# Start all services in background
docker compose up -d

# Start specific service
docker compose up -d backend

# Start with build
docker compose up -d --build

# View logs
docker compose logs -f [service_name]
```

### Stopping Services

```bash
# Stop all services
docker compose stop

# Stop specific service
docker compose stop backend

# Stop and remove containers
docker compose down

# Stop, remove containers, and delete volumes
docker compose down -v
```

### Scaling Services

```bash
# Scale backend to 3 instances (requires load balancer)
docker compose up -d --scale backend=3
```

### Health Checks

All services include health checks:

```bash
# Check service health status
docker compose ps

# Manual health check
curl http://localhost:3000/health        # Backend
curl http://localhost:3000/health/ready  # Backend readiness
curl http://localhost:3000/health/live   # Backend liveness
curl http://localhost:5173/              # Frontend
```

## Environment Configuration

### Required Environment Variables

#### Database Configuration
```bash
POSTGRES_DB=myapp                    # Database name
POSTGRES_USER=appuser                # Database user
POSTGRES_PASSWORD=secure_password    # CHANGE IN PRODUCTION
DATABASE_URL=postgresql://appuser:secure_password@localhost:5001/myapp
```

#### Backend Configuration
```bash
NODE_ENV=production                  # Environment mode
BACKEND_PORT=3000                    # Backend port
JWT_SECRET=<64-char-random-string>   # MUST CHANGE
JWT_REFRESH_SECRET=<64-char-random-string>  # MUST CHANGE
ENCRYPTION_KEY=<32-char-string>      # MUST CHANGE
CORS_ORIGIN=https://yourdomain.com   # Frontend URL
```

#### Frontend Configuration
```bash
FRONTEND_PORT=5173                   # Frontend port (dev)
VITE_API_URL=https://api.yourdomain.com      # Backend API URL
VITE_WS_URL=wss://api.yourdomain.com         # WebSocket URL
VITE_SITE_URL=https://yourdomain.com         # Site URL
```

#### Protocol Services (Optional)
```bash
SNMP_ENABLED=true
SNMP_SERVICE_URL=https://snmp.example.com
SNMP_API_KEY=your-snmp-api-key

WEBPA_ENABLED=true
WEBPA_SERVICE_URL=https://webpa.example.com
WEBPA_API_KEY=your-webpa-api-key

TR69_ENABLED=true
TR69_SERVICE_URL=https://acs.example.com
TR69_API_KEY=your-tr69-api-key

TR369_ENABLED=true
TR369_SERVICE_URL=https://usp.example.com
TR369_API_KEY=your-tr369-api-key
```

### Generating Secure Secrets

```bash
# Generate JWT secrets (64 characters recommended)
openssl rand -base64 48

# Generate encryption key (exactly 32 characters)
openssl rand -base64 24

# Generate secure password
openssl rand -base64 32
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All secrets changed from defaults
- [ ] Strong passwords generated
- [ ] Environment variables configured
- [ ] HTTPS certificates obtained
- [ ] Database SSL configured
- [ ] CORS configured to specific domains
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Log aggregation configured

### Production Environment File

Create `.env.production`:

```bash
# Database (use managed database service recommended)
DATABASE_URL=postgresql://user:pass@db-prod.example.com:5432/devicemgmt?sslmode=require

# Backend
NODE_ENV=production
BACKEND_PORT=3000
JWT_SECRET=<production-secret>
JWT_REFRESH_SECRET=<production-refresh-secret>
ENCRYPTION_KEY=<production-encryption-key>
CORS_ORIGIN=https://devicemgmt.example.com

# Frontend
VITE_API_URL=https://api.devicemgmt.example.com
VITE_WS_URL=wss://api.devicemgmt.example.com
VITE_SITE_URL=https://devicemgmt.example.com

# Security
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: your-registry/device-mgmt-backend:latest
    restart: always
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  frontend:
    image: your-registry/device-mgmt-frontend:latest
    restart: always
    env_file:
      - .env.production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Production Deployment Steps

1. **Build production images:**
   ```bash
   docker compose -f docker-compose.yml build --no-cache
   ```

2. **Tag and push to registry:**
   ```bash
   docker tag device-mgmt-backend your-registry/device-mgmt-backend:latest
   docker tag device-mgmt-frontend your-registry/device-mgmt-frontend:latest
   docker push your-registry/device-mgmt-backend:latest
   docker push your-registry/device-mgmt-frontend:latest
   ```

3. **Deploy to production server:**
   ```bash
   # On production server
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Run database migrations:**
   ```bash
   cd DatabaseContainer
   bash run_migrations.sh
   ```

5. **Verify deployment:**
   ```bash
   curl https://api.yourdomain.com/health
   curl https://yourdomain.com/
   ```

### HTTPS/SSL Configuration

#### Using Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cloud Deployment

### AWS Deployment

#### Using ECS/Fargate

1. **Create ECR repositories:**
   ```bash
   aws ecr create-repository --repository-name device-mgmt-backend
   aws ecr create-repository --repository-name device-mgmt-frontend
   ```

2. **Push images to ECR:**
   ```bash
   $(aws ecr get-login --no-include-email)
   docker tag device-mgmt-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/device-mgmt-backend:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/device-mgmt-backend:latest
   ```

3. **Create RDS PostgreSQL instance**
4. **Create ECS task definitions**
5. **Deploy services with load balancer**

#### Using EC2

1. **Launch EC2 instance** (t3.medium or larger)
2. **Install Docker and Docker Compose**
3. **Clone repository and configure**
4. **Start services with docker compose**

### Google Cloud Platform

#### Using Cloud Run

1. **Build and push to GCR:**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/device-mgmt-backend
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy device-mgmt-backend \
     --image gcr.io/PROJECT_ID/device-mgmt-backend \
     --platform managed \
     --set-env-vars "DATABASE_URL=..."
   ```

3. **Use Cloud SQL for PostgreSQL**

### Azure Deployment

#### Using Azure Container Instances

1. **Create resource group**
2. **Create Azure Database for PostgreSQL**
3. **Deploy container groups:**
   ```bash
   az container create \
     --resource-group myResourceGroup \
     --name device-mgmt-backend \
     --image your-registry/device-mgmt-backend:latest \
     --ports 3000 \
     --environment-variables \
       DATABASE_URL="..." \
       JWT_SECRET="..."
   ```

## Monitoring & Maintenance

### Health Monitoring

```bash
# Create health check script
cat > healthcheck.sh << 'EOF'
#!/bin/bash
curl -f http://localhost:3000/health || exit 1
curl -f http://localhost:5173/ || exit 1
EOF

chmod +x healthcheck.sh

# Add to crontab (every 5 minutes)
*/5 * * * * /path/to/healthcheck.sh || /path/to/alert.sh
```

### Log Management

```bash
# View logs
docker compose logs -f --tail=100

# Export logs
docker compose logs > app.log

# Rotate logs
docker compose logs --since 24h > daily.log
```

### Database Maintenance

```bash
# Backup database
cd DatabaseContainer
bash backup_db.sh

# View database size
docker compose exec database psql -U appuser -d myapp -c "SELECT pg_size_pretty(pg_database_size('myapp'));"

# Vacuum database
docker compose exec database psql -U appuser -d myapp -c "VACUUM ANALYZE;"
```

## Backup & Recovery

### Database Backup

```bash
# Manual backup
docker compose exec database pg_dump -U appuser myapp > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (crontab)
0 2 * * * docker compose exec database pg_dump -U appuser myapp > /backups/db_$(date +\%Y\%m\%d).sql
```

### Database Restore

```bash
# Restore from backup
docker compose exec -T database psql -U appuser myapp < backup_20240101_020000.sql
```

### Volume Backup

```bash
# Backup Docker volumes
docker run --rm -v device-mgmt-postgres-data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres-data-backup.tar.gz /data
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs database
docker compose logs backend
docker compose logs frontend

# Check service status
docker compose ps

# Restart specific service
docker compose restart backend
```

### Database Connection Issues

```bash
# Test database connection
docker compose exec database psql -U appuser -d myapp -c "SELECT 1;"

# Check database logs
docker compose logs database

# Verify DATABASE_URL
docker compose exec backend printenv DATABASE_URL
```

### Port Conflicts

```bash
# Check what's using ports
lsof -i :3000
lsof -i :5173
lsof -i :5001

# Change ports in .env
BACKEND_PORT=3001
FRONTEND_PORT=5174
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase container resources in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

### SSL Certificate Issues

```bash
# Verify certificate
openssl x509 -in certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

## Support

For deployment issues:
1. Check service logs
2. Verify environment variables
3. Review health check endpoints
4. Consult container-specific README files
5. Open an issue with deployment details
