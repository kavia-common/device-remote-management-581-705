# Device Remote Management Platform

A comprehensive multi-protocol device management platform that provides a unified web-based interface for managing network devices through SNMP (v2/v3), WebPA, TR-069/ACS, and TR-369/USP protocols.

## Architecture Overview

The platform consists of three main containers:

### 🗄️ DatabaseContainer (PostgreSQL)
- **Port**: 5001 (host) → 5432 (container)
- **Purpose**: Persistent data storage with multi-tenant isolation
- **Features**:
  - Row-Level Security (RLS) for tenant isolation
  - Partitioned tables for query history and audit logs
  - JSONB support for flexible protocol configurations
  - Automated migrations and seed data

### ⚙️ BackendContainer (Node.js/Express)
- **Port**: 3000
- **Purpose**: REST API backend with authentication and protocol integration
- **Features**:
  - JWT-based authentication with refresh tokens
  - Role-Based Access Control (RBAC)
  - Multi-protocol support (SNMP, WebPA, TR-069, TR-369)
  - Asynchronous query execution
  - Comprehensive audit logging
  - Health check endpoints

### 🎨 FrontendContainer (React/Vite)
- **Port**: 5173 (dev) / 80 (prod)
- **Purpose**: Modern web interface for device management
- **Features**:
  - React 18 with Vite for fast development
  - Tailwind CSS for styling
  - Zustand for state management
  - React Hook Form for form validation
  - Protected routes with authentication guards

## Quick Start

### Prerequisites

- Docker and Docker Compose **OR**
- Node.js 18+ and PostgreSQL 15+

### Option 1: Docker Compose (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   cd device-remote-management-581-705
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (optional for dev)
   ```

3. **Start all services:**
   ```bash
   docker compose up -d
   ```

4. **Wait for services to be healthy:**
   ```bash
   docker compose ps
   # All services should show "healthy" status
   ```

5. **Access the application:**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000
   - **Database**: localhost:5001

6. **Default login credentials:**
   - Email: `admin@example.com`
   - Password: `Admin@123`
   - ⚠️ **Change these immediately in production!**

### Option 2: Local Development

#### 1. Start Database

```bash
cd DatabaseContainer
bash startup.sh
```

#### 2. Start Backend

```bash
cd BackendContainer
cp .env.example .env
# Edit .env with database connection
npm install
npm start
```

#### 3. Start Frontend

```bash
cd FrontendContainer
cp .env.example .env
# Edit .env with backend API URL
npm install
npm run dev
```

## Project Structure

```
device-remote-management-581-705/
├── docker-compose.yml              # Multi-container orchestration
├── .env                            # Environment configuration
├── .env.example                    # Environment template
├── README.md                       # This file
├── DEPLOYMENT.md                   # Deployment guide
├── API_DOCUMENTATION.md            # API reference
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # CI/CD pipeline
├── DatabaseContainer/              # PostgreSQL database
│   ├── migrations/                # Schema migrations
│   ├── seeds/                     # Seed data
│   ├── Dockerfile                 # Database container image
│   └── README.md                  # Database documentation
├── BackendContainer/               # Node.js/Express API
│   ├── src/
│   │   ├── server.js             # Main entry point
│   │   ├── middleware/           # Auth, RBAC, RLS, logging
│   │   ├── routes/               # API route handlers
│   │   └── services/             # Business logic & protocols
│   ├── Dockerfile                 # Backend container image
│   ├── package.json              # Dependencies
│   └── README.md                  # Backend documentation
└── FrontendContainer/              # React/Vite frontend
    ├── src/
    │   ├── main.jsx              # Application entry
    │   ├── App.jsx               # Main app with routing
    │   ├── components/           # Reusable components
    │   ├── pages/                # Page components
    │   ├── services/             # API services
    │   └── store/                # State management
    ├── Dockerfile                 # Frontend container image
    ├── package.json              # Dependencies
    └── README.md                  # Frontend documentation
```

## Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Role-Based Access Control (RBAC) with three roles: admin, operator, viewer
- Multi-tenant isolation via PostgreSQL Row-Level Security
- Secure password hashing with bcrypt

### 📡 Multi-Protocol Support
- **SNMP (v2c/v3)**: MIB parsing, OID queries, configuration management
- **WebPA**: REST API integration for RDKB devices
- **TR-069/ACS**: CWMP protocol support with ECO ACS integration
- **TR-369/USP**: Next-gen protocol with MTP support (STOMP, WebSocket, MQTT, CoAP)

### 🔍 Device Management
- Complete CRUD operations for devices
- User-device associations with tenant isolation
- Device status tracking and metadata
- Protocol-specific configuration per device
- Tag-based organization

### 📊 Query Execution
- Asynchronous query processing
- Query history tracking with pagination
- Protocol-specific query handlers
- Real-time query status updates

### 📝 Audit & Compliance
- Automatic logging of all API actions
- User action tracking
- Request metadata capture
- Partitioned audit logs for performance

### 🏥 Health Monitoring
- Readiness and liveness probes
- Database connection checks
- Service dependency validation
- Docker healthcheck support

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Devices
- `GET /api/devices` - List devices
- `POST /api/devices` - Create device
- `GET /api/devices/:id` - Get device details
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Queries
- `POST /api/queries/execute` - Execute query
- `GET /api/queries/:id` - Get query result
- `GET /api/queries` - Query history

### Protocols
- `GET /api/protocols/:deviceId` - Get protocol configs
- `POST /api/protocols/:deviceId/:type` - Configure protocol
- `DELETE /api/protocols/:deviceId/:type` - Remove config

### Health
- `GET /health` - Full health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## Development

### Running Tests

```bash
# Backend tests
cd BackendContainer
npm test

# Frontend tests
cd FrontendContainer
npm test
```

### Linting

```bash
# Backend
cd BackendContainer
npm run lint

# Frontend
cd FrontendContainer
npm run lint
```

### Database Migrations

```bash
cd DatabaseContainer
bash run_migrations.sh
```

### Viewing Logs

```bash
# Docker Compose
docker compose logs -f [service_name]

# View all logs
docker compose logs -f

# View specific service
docker compose logs -f backend
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.

### Quick Production Checklist

- [ ] Change all secrets in `.env` (JWT, encryption keys, passwords)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Enable HTTPS/TLS
- [ ] Set up SSL for PostgreSQL
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review and harden security settings
- [ ] Set up log aggregation
- [ ] Configure environment-specific URLs

## Environment Variables

See `.env.example` for all available configuration options.

### Critical Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (MUST change in production)
- `JWT_REFRESH_SECRET` - Refresh token secret (MUST change in production)
- `ENCRYPTION_KEY` - Encryption key for sensitive data (32 characters)
- `CORS_ORIGIN` - Allowed CORS origins
- `VITE_API_URL` - Frontend API URL
- Protocol service URLs and API keys (configure as needed)

## Troubleshooting

### Database Connection Failed
```bash
# Check database is running
docker compose ps database
# View database logs
docker compose logs database
```

### Backend Not Starting
```bash
# Check environment variables
cat .env
# View backend logs
docker compose logs backend
```

### Frontend Build Errors
```bash
# Clear cache and rebuild
cd FrontendContainer
rm -rf node_modules dist
npm install
npm run build
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000  # Backend
lsof -i :5173  # Frontend
lsof -i :5001  # Database
```

## Security

### Production Security Checklist

- [ ] All default passwords changed
- [ ] Strong random secrets generated
- [ ] HTTPS enabled with valid certificates
- [ ] CORS configured to specific origins
- [ ] Rate limiting enabled
- [ ] Database SSL enabled
- [ ] Environment variables secured
- [ ] No secrets in version control
- [ ] Regular security updates applied
- [ ] Audit logging enabled
- [ ] Backup encryption enabled

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check container-specific README files
- Review [DEPLOYMENT.md](./DEPLOYMENT.md)
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Open an issue on the project repository

## Acknowledgments

- Built with modern web technologies
- Follows industry best practices for security and architecture
- Designed for scalability and maintainability
