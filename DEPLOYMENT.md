# Production Deployment Guide

This guide covers deploying the Device Remote Management Platform to production environments.

## Pre-Deployment Checklist

### Security

- [ ] Generate strong `JWT_SECRET` (min 32 chars): `openssl rand -hex 32`
- [ ] Use strong `POSTGRES_PASSWORD` (min 16 chars, mixed case, numbers, symbols)
- [ ] Update `CORS_ORIGINS` with production domain(s)
- [ ] Review and restrict database port exposure
- [ ] Enable SSL/TLS for all external connections
- [ ] Configure firewall rules
- [ ] Set up secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Review RLS policies

### Infrastructure

- [ ] Provision sufficient resources (see requirements below)
- [ ] Set up managed database (RDS, CloudSQL, Azure Database)
- [ ] Set up managed Redis (ElastiCache, Azure Cache)
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up CI/CD pipeline
- [ ] Plan disaster recovery

### Configuration

- [ ] Update `.env` for production values
- [ ] Set `VITE_API_BASE_URL` to production backend URL
- [ ] Configure email service (if using notifications)
- [ ] Set up external authentication (OIDC/SAML) if needed
- [ ] Review and tune database connection pool settings
- [ ] Configure Celery worker concurrency

## Resource Requirements

### Minimum (Small Deployment)

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 50 GB SSD
- **Network**: 100 Mbps
- **Expected Load**: <100 devices, <10 concurrent users

### Recommended (Medium Deployment)

- **CPU**: 8 cores
- **RAM**: 16 GB
- **Disk**: 200 GB SSD
- **Network**: 1 Gbps
- **Expected Load**: <1000 devices, <50 concurrent users

### High Availability (Large Deployment)

- **CPU**: 16+ cores (distributed)
- **RAM**: 32+ GB (distributed)
- **Disk**: 500+ GB SSD (with replication)
- **Network**: 10 Gbps
- **Expected Load**: >1000 devices, >50 concurrent users

## Deployment Options

### Option 1: Docker Compose (Single Server)

Suitable for small to medium deployments.

**Steps**:

1. **Prepare server**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt install docker-compose-plugin -y
   ```

2. **Deploy application**:
   ```bash
   # Clone repository
   git clone <repo-url>
   cd device-remote-management-581-705
   
   # Configure environment
   cp .env.example .env
   nano .env  # Update all production values
   
   # Start services
   docker-compose up -d
   ```

3. **Set up reverse proxy** (nginx):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # Frontend
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       # Backend API
       location /api/ {
           proxy_pass http://localhost:8080/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           
           # WebSocket support (for SSE)
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_read_timeout 86400;
       }
   }
   ```

4. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

### Option 2: Kubernetes

Suitable for medium to large deployments with HA requirements.

**Prerequisites**:
- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl configured
- Helm 3+ installed

**Steps**:

1. **Create namespace**:
   ```bash
   kubectl create namespace drm
   ```

2. **Create secrets**:
   ```bash
   kubectl create secret generic drm-secrets \
     --from-literal=postgres-password=<strong-password> \
     --from-literal=jwt-secret=<jwt-secret> \
     -n drm
   ```

3. **Deploy PostgreSQL** (using Helm):
   ```bash
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm install postgresql bitnami/postgresql \
     --namespace drm \
     --set auth.username=appuser \
     --set auth.database=myapp \
     --set auth.existingSecret=drm-secrets \
     --set primary.persistence.size=100Gi
   ```

4. **Deploy Redis**:
   ```bash
   helm install redis bitnami/redis \
     --namespace drm \
     --set auth.enabled=false \
     --set master.persistence.size=10Gi
   ```

5. **Build and push images**:
   ```bash
   # Backend
   docker build -t your-registry/drm-backend:v1.0.0 ./BackendContainer
   docker push your-registry/drm-backend:v1.0.0
   
   # Frontend
   docker build -t your-registry/drm-frontend:v1.0.0 \
     --build-arg VITE_API_BASE_URL=https://api.your-domain.com \
     ./FrontendContainer
   docker push your-registry/drm-frontend:v1.0.0
   ```

6. **Deploy application** (create k8s manifests or use Helm chart)

See `k8s/` directory for example Kubernetes manifests (to be created).

### Option 3: Cloud-Native (AWS Example)

Using managed services for database and Redis.

**Architecture**:
- RDS PostgreSQL for database
- ElastiCache Redis for broker/cache
- ECS Fargate for containers
- ALB for load balancing
- CloudFront for frontend CDN

**Steps**:

1. **Create RDS PostgreSQL**:
   - Instance type: db.t3.medium or larger
   - Multi-AZ: Yes
   - Automated backups: Yes (7-30 days retention)
   - Encryption: Yes
   - VPC: Private subnets only

2. **Create ElastiCache Redis**:
   - Node type: cache.t3.medium or larger
   - Multi-AZ: Yes
   - Automatic backups: Yes

3. **Run database migrations**:
   ```bash
   # From a bastion host or via ECS task
   ./DatabaseContainer/migrate.sh up
   ```

4. **Deploy to ECS**:
   - Create task definitions for backend and worker
   - Configure environment variables (use AWS Secrets Manager)
   - Set up auto-scaling
   - Configure ALB target groups

5. **Deploy frontend**:
   - Build frontend with production API URL
   - Upload to S3
   - Configure CloudFront distribution
   - Set up custom domain and SSL

6. **Configure DNS**:
   - Point frontend domain to CloudFront
   - Point API domain to ALB

## Environment Configuration

### Production .env

```env
# Database (use RDS endpoint in production)
POSTGRES_DB=myapp
POSTGRES_USER=appuser
POSTGRES_PASSWORD=<USE-SECRETS-MANAGER>
POSTGRES_EXTERNAL_PORT=5432  # Don't expose in production

# Redis (use ElastiCache endpoint)
REDIS_EXTERNAL_PORT=6379  # Don't expose in production

# Backend
BACKEND_PORT=8080
JWT_SECRET=<USE-SECRETS-MANAGER>
JWT_EXPIRES_IN=3600

# CORS (use production domains)
CORS_ORIGINS=https://app.your-domain.com,https://your-domain.com

# Celery
ENABLE_SSE=true

# Frontend
FRONTEND_PORT=3000
VITE_API_BASE_URL=https://api.your-domain.com
```

### Backend .env

```env
DATABASE_URL=postgresql+asyncpg://appuser:<password>@prod-rds.region.rds.amazonaws.com:5432/myapp
CELERY_BROKER_URL=redis://prod-elasticache.region.cache.amazonaws.com:6379/0
CELERY_RESULT_BACKEND=redis://prod-elasticache.region.cache.amazonaws.com:6379/1
JWT_SECRET=<USE-SECRETS-MANAGER>
JWT_EXPIRES_IN=3600
CORS_ORIGINS=https://app.your-domain.com,https://your-domain.com
ENABLE_SSE=true
PORT=8080
LOG_LEVEL=WARNING
```

## Database Migration Strategy

### Initial Setup

1. **Create database**:
   ```bash
   # On RDS or managed database
   CREATE DATABASE myapp;
   CREATE USER appuser WITH PASSWORD '<strong-password>';
   GRANT ALL PRIVILEGES ON DATABASE myapp TO appuser;
   ```

2. **Run migrations**:
   ```bash
   cd DatabaseContainer
   echo "psql postgresql://appuser:<password>@<db-host>:5432/myapp" > db_connection.txt
   ./migrate.sh up
   ```

### Zero-Downtime Updates

For schema changes in production:

1. **Test migrations** in staging environment first
2. **Backup database** before applying
3. **Use blue-green deployment** for breaking changes
4. **Apply migrations** before deploying new code
5. **Monitor** for errors after deployment

## Monitoring and Observability

### Health Checks

All services expose health check endpoints:

- **Backend**: `GET /docs` (should return 200)
- **Frontend**: `GET /` (should return 200)
- **Database**: `pg_isready`
- **Redis**: `redis-cli ping`

### Logging

**Centralized Logging** (example with CloudWatch):

1. Configure Docker logging driver:
   ```yaml
   services:
     backend:
       logging:
         driver: awslogs
         options:
           awslogs-group: /ecs/drm-backend
           awslogs-region: us-east-1
           awslogs-stream-prefix: ecs
   ```

2. Set log level to WARNING or ERROR in production
3. Enable structured JSON logging

### Metrics

**Key metrics to monitor**:

- CPU and memory usage per container
- Request rate and latency (p50, p95, p99)
- Error rate (4xx, 5xx responses)
- Database connection pool usage
- Celery queue depth and task duration
- Redis memory usage

**Tools**:
- Prometheus + Grafana
- CloudWatch
- DataDog
- New Relic

### Alerting

**Set up alerts for**:

- Service down (failed health checks)
- High error rate (>5% of requests)
- High latency (p95 > 2s)
- Database connection errors
- Disk space low (<10%)
- Memory usage high (>85%)
- Celery queue backed up (>100 pending tasks)

## Backup and Disaster Recovery

### Database Backups

**Automated backups**:
```bash
# Daily backup cron job
0 2 * * * docker-compose exec -T db pg_dump -U appuser myapp | gzip > /backups/myapp_$(date +\%Y\%m\%d).sql.gz
```

**Backup retention**:
- Daily: Keep 7 days
- Weekly: Keep 4 weeks
- Monthly: Keep 12 months

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: <1 hour
2. **RPO (Recovery Point Objective)**: <5 minutes

**Recovery Steps**:

1. Provision new infrastructure (or use standby)
2. Restore database from latest backup
3. Deploy application containers
4. Update DNS to point to new infrastructure
5. Verify all services are operational

## Security Hardening

### Network Security

- Use private subnets for database and Redis
- Configure security groups to allow only necessary traffic
- Enable VPC flow logs
- Use AWS PrivateLink or VPC peering for inter-service communication

### Application Security

- Enable rate limiting (e.g., 100 req/min per IP)
- Implement API key rotation policy
- Use prepared statements (SQLAlchemy handles this)
- Validate all input data
- Sanitize user-generated content
- Keep dependencies up to date

### Compliance

- Enable audit logging for all data access
- Implement data retention policies
- Configure encryption at rest and in transit
- Regular security audits and penetration testing
- GDPR/HIPAA compliance if handling sensitive data

## Scaling Strategies

### Horizontal Scaling

**Backend API**:
```bash
# Docker Compose
docker-compose up -d --scale backend=3

# Kubernetes
kubectl scale deployment drm-backend --replicas=3 -n drm
```

**Workers**:
```bash
# Increase workers for higher throughput
docker-compose up -d --scale worker=5
```

### Vertical Scaling

Update resource limits in docker-compose.yml or Kubernetes manifests.

### Database Scaling

- Enable read replicas for read-heavy workloads
- Use connection pooling (PgBouncer)
- Implement caching layer (Redis)
- Partition large tables
- Optimize queries and add indexes

## Rollback Procedures

### Application Rollback

```bash
# Docker Compose
docker-compose pull  # Get previous image version
docker-compose up -d

# Kubernetes
kubectl rollout undo deployment/drm-backend -n drm
kubectl rollout undo deployment/drm-frontend -n drm
```

### Database Rollback

**If migration causes issues**:

1. Restore from backup before migration
2. Or write reverse migration script
3. Test rollback in staging first

## Maintenance Windows

**Recommended schedule**:
- Weekly: Dependency updates (test in staging first)
- Monthly: Security patches
- Quarterly: Major version upgrades

**During maintenance**:
1. Enable maintenance mode page
2. Notify users in advance
3. Take full backup
4. Apply updates
5. Verify all services
6. Disable maintenance mode

## Cost Optimization

### AWS Cost Estimates (Medium Deployment)

- **RDS PostgreSQL** (db.t3.medium): ~$100/month
- **ElastiCache Redis** (cache.t3.medium): ~$80/month
- **ECS Fargate**: ~$150/month (2 tasks, 2 GB each)
- **ALB**: ~$20/month
- **CloudFront**: ~$50/month (1 TB transfer)
- **Total**: ~$400/month

### Cost Saving Tips

- Use Reserved Instances or Savings Plans
- Right-size resources based on actual usage
- Use S3 for static assets (cheaper than CloudFront for low traffic)
- Enable auto-scaling to scale down during off-hours
- Use spot instances for non-critical workers

## Support and Troubleshooting

### Common Production Issues

**1. High Database Connections**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';
```

**2. Redis Memory Full**
```bash
# Check memory
docker-compose exec redis redis-cli info memory

# Flush non-critical data
docker-compose exec redis redis-cli FLUSHDB
```

**3. Worker Queue Backed Up**
```bash
# Inspect queue
docker-compose exec worker celery -A src.celery_app.celery_app inspect active

# Purge failed tasks
docker-compose exec worker celery -A src.celery_app.celery_app purge
```

For additional support, contact the development team or open an issue in the repository.
