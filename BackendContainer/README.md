# Backend Container - Device Remote Management Platform

Node.js/Express REST API backend for the Device Remote Management platform with multi-protocol support (SNMP, WebPA, TR-069, TR-369).

## Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Role-Based Access Control (RBAC)
  - Multi-tenant isolation via PostgreSQL Row-Level Security (RLS)

- **Device Management**
  - Complete CRUD operations for devices
  - User-device associations with tenant isolation
  - Device status tracking and metadata

- **Protocol Support**
  - SNMP (v2c/v3) - Service stub with configuration support
  - WebPA - Service stub with REST API structure
  - TR-069/ACS - Service stub with ECO ACS integration ready
  - TR-369/USP - Service stub with MTP protocol support

- **Query Execution**
  - Asynchronous query processing
  - Query history tracking
  - Protocol-specific query handlers

- **Audit Logging**
  - Automatic logging of all API actions
  - User action tracking
  - Request metadata capture

- **Security**
  - Helmet.js security headers
  - CORS configuration
  - Request rate limiting (configurable)
  - Environment-based secrets

## Prerequisites

- Node.js 18+
- PostgreSQL database (DatabaseContainer must be running)
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
cd BackendContainer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your configuration
```

**Important**: Update the following in `.env`:
- `DATABASE_URL` - PostgreSQL connection string from DatabaseContainer
- `JWT_SECRET` - Strong random secret for JWT signing
- `JWT_REFRESH_SECRET` - Strong random secret for refresh tokens

### 3. Start the Server

```bash
# Using startup script (recommended)
bash startup.sh

# Or directly with npm
npm start

# Or in development mode with auto-reload
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate session
- `GET /api/auth/me` - Get current user info

### Devices

- `GET /api/devices` - List all devices (filtered by tenant)
- `GET /api/devices/:id` - Get device details
- `POST /api/devices` - Create new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Queries

- `POST /api/queries/execute` - Execute device query (async)
- `GET /api/queries/:id` - Get query result
- `GET /api/queries` - List query history

### Protocols

- `GET /api/protocols/:deviceId` - Get device protocol configurations
- `POST /api/protocols/:deviceId/:protocolType` - Configure protocol
- `DELETE /api/protocols/:deviceId/:protocolType` - Remove protocol config

### Users

- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user

### Health

- `GET /health` - Full health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Authentication

All API endpoints (except `/health` and `/api/auth/*`) require authentication.

### Login Example

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "role_name": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

### Using Access Token

Include the access token in the `Authorization` header:

```bash
curl http://localhost:3000/api/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Protocol Implementation

The backend includes service stubs for all protocols. To implement actual protocol functionality:

### SNMP
1. Install `net-snmp` library: `npm install net-snmp`
2. Implement query logic in `src/services/protocols/snmpService.js`
3. Add SNMP session management and OID handling

### WebPA
1. Implement REST API calls in `src/services/protocols/webpaService.js`
2. Add WebPA authentication and parameter handling
3. Configure WebPA endpoint URLs per device

### TR-069
1. Integrate with ECO ACS REST API or similar
2. Implement CWMP operations in `src/services/protocols/tr69Service.js`
3. Add TR-069 parameter value handling

### TR-369/USP
1. Install USP protocol library
2. Implement MTP handlers (STOMP, WebSocket, MQTT, CoAP)
3. Add USP message encoding/decoding in `src/services/protocols/tr369Service.js`

## Database Integration

The backend automatically:
- Sets PostgreSQL RLS context variables for each request
- Enforces tenant isolation at the database level
- Logs all operations to `audit_logs` table

RLS Context Variables:
```sql
SET app.current_user_id = 'user-uuid';
SET app.current_tenant_id = 'tenant-uuid';
```

## Environment Variables

See `.env.example` for all available configuration options.

### Critical Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (must be changed in production!)
- `JWT_REFRESH_SECRET` - Refresh token secret (must be changed in production!)

### Protocol Toggles

Enable/disable protocols:
- `SNMP_ENABLED=true`
- `WEBPA_ENABLED=true`
- `TR69_ENABLED=true`
- `TR369_ENABLED=true`

## Docker Deployment

Build and run with Docker:

```bash
docker build -t device-mgmt-backend .
docker run -p 3000:3000 --env-file .env device-mgmt-backend
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### File Structure

```
BackendContainer/
├── src/
│   ├── server.js              # Main application entry point
│   ├── middleware/            # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── rbac.js           # Role-based access control
│   │   ├── rlsContext.js     # PostgreSQL RLS context
│   │   ├── auditLogger.js    # Audit logging
│   │   └── errorHandler.js   # Global error handling
│   ├── routes/                # API route handlers
│   │   ├── auth.js
│   │   ├── devices.js
│   │   ├── queries.js
│   │   ├── protocols.js
│   │   ├── users.js
│   │   └── health.js
│   └── services/              # Business logic services
│       ├── authService.js     # Authentication service
│       ├── protocolService.js # Protocol dispatcher
│       └── protocols/         # Protocol implementations
│           ├── snmpService.js
│           ├── webpaService.js
│           ├── tr69Service.js
│           └── tr369Service.js
├── .env.example
├── .gitignore
├── package.json
├── Dockerfile
├── startup.sh
└── README.md
```

## Troubleshooting

### Database Connection Failed

Ensure DatabaseContainer is running:
```bash
cd ../DatabaseContainer
bash startup.sh
```

### Invalid Token Errors

Check JWT secrets in `.env` match between restarts.

### Permission Denied

Verify user has correct role and permissions in database.

## Security Notes

⚠️ **Production Checklist**:
- [ ] Change `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to specific domains
- [ ] Enable rate limiting
- [ ] Use HTTPS in production
- [ ] Rotate secrets regularly
- [ ] Enable audit log monitoring

## License

MIT
