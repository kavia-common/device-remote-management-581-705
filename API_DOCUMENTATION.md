# API Documentation - Device Remote Management Platform

Complete API reference for the Device Remote Management Platform backend.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.yourdomain.com`

## Authentication

All API endpoints (except `/health` and `/api/auth/*`) require authentication using JWT Bearer tokens.

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Expiration

- **Access Token**: 15 minutes (default)
- **Refresh Token**: 7 days (default)

When an access token expires, use the refresh token to obtain a new access token.

---

## Authentication Endpoints

### Register New User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "operator"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role_name": "operator",
    "tenant_id": "uuid"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input or email already exists
- `500 Internal Server Error` - Server error

---

### Login

Authenticate user and receive tokens.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role_name": "operator",
    "tenant_id": "uuid"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server error

---

### Refresh Token

Obtain a new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token
- `500 Internal Server Error` - Server error

---

### Logout

Invalidate current session and tokens.

**Endpoint:** `POST /api/auth/logout`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

Retrieve authenticated user information.

**Endpoint:** `GET /api/auth/me`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role_name": "operator",
  "tenant_id": "uuid",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## Device Endpoints

### List Devices

Get all devices for the authenticated user's tenant.

**Endpoint:** `GET /api/devices`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `search` (optional) - Search term for name/serial
- `status` (optional) - Filter by status (online, offline, unknown)

**Response:** `200 OK`
```json
{
  "devices": [
    {
      "id": "uuid",
      "name": "Router-01",
      "serial_number": "SN123456",
      "model": "XR-500",
      "manufacturer": "ACME Corp",
      "status": "online",
      "ip_address": "192.168.1.1",
      "protocols": ["snmp", "webpa"],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### Get Device Details

Retrieve detailed information for a specific device.

**Endpoint:** `GET /api/devices/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Router-01",
  "serial_number": "SN123456",
  "model": "XR-500",
  "manufacturer": "ACME Corp",
  "status": "online",
  "ip_address": "192.168.1.1",
  "mac_address": "00:11:22:33:44:55",
  "firmware_version": "1.2.3",
  "protocols": ["snmp", "webpa"],
  "metadata": {
    "location": "Building A",
    "department": "IT"
  },
  "tags": ["production", "critical"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- `404 Not Found` - Device not found
- `403 Forbidden` - Access denied

---

### Create Device

Register a new device.

**Endpoint:** `POST /api/devices`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Router-01",
  "serial_number": "SN123456",
  "model": "XR-500",
  "manufacturer": "ACME Corp",
  "ip_address": "192.168.1.1",
  "mac_address": "00:11:22:33:44:55",
  "firmware_version": "1.2.3",
  "protocols": ["snmp", "webpa"],
  "metadata": {
    "location": "Building A"
  },
  "tags": ["production"]
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Router-01",
  "serial_number": "SN123456",
  ...
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `409 Conflict` - Device with serial number already exists

---

### Update Device

Update device information.

**Endpoint:** `PUT /api/devices/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Router-01-Updated",
  "status": "online",
  "firmware_version": "1.2.4",
  "metadata": {
    "location": "Building B"
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Router-01-Updated",
  ...
}
```

---

### Delete Device

Remove a device from the system.

**Endpoint:** `DELETE /api/devices/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "message": "Device deleted successfully"
}
```

---

## Protocol Configuration Endpoints

### Get Protocol Configurations

Retrieve all protocol configurations for a device.

**Endpoint:** `GET /api/protocols/:deviceId`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "deviceId": "uuid",
  "protocols": {
    "snmp": {
      "version": "v3",
      "port": 161,
      "community": "public",
      "security_level": "authPriv",
      "auth_protocol": "SHA",
      "privacy_protocol": "AES"
    },
    "webpa": {
      "endpoint": "https://webpa.example.com",
      "auth_token": "encrypted_token"
    }
  }
}
```

---

### Configure Protocol

Add or update protocol configuration for a device.

**Endpoint:** `POST /api/protocols/:deviceId/:protocolType`

**Path Parameters:**
- `deviceId` - Device UUID
- `protocolType` - Protocol type: `snmp`, `webpa`, `tr69`, `tr369`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body (SNMP example):**
```json
{
  "version": "v3",
  "port": 161,
  "community": "public",
  "security_level": "authPriv",
  "auth_protocol": "SHA",
  "auth_password": "authpass123",
  "privacy_protocol": "AES",
  "privacy_password": "privpass123"
}
```

**Request Body (WebPA example):**
```json
{
  "endpoint": "https://webpa.example.com/api/v1",
  "auth_token": "your_auth_token"
}
```

**Request Body (TR-069 example):**
```json
{
  "acs_url": "https://acs.example.com/acs",
  "acs_username": "device123",
  "acs_password": "devicepass",
  "connection_request_url": "http://device.local:7547/",
  "connection_request_username": "admin",
  "connection_request_password": "adminpass"
}
```

**Request Body (TR-369 example):**
```json
{
  "endpoint_id": "device-123",
  "mtp_protocol": "stomp",
  "broker_url": "stomp://broker.example.com:61613",
  "username": "device123",
  "password": "devicepass"
}
```

**Response:** `201 Created`
```json
{
  "message": "Protocol configured successfully",
  "protocolType": "snmp",
  "deviceId": "uuid"
}
```

---

### Remove Protocol Configuration

Delete protocol configuration from a device.

**Endpoint:** `DELETE /api/protocols/:deviceId/:protocolType`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "message": "Protocol configuration removed successfully"
}
```

---

## Query Execution Endpoints

### Execute Query

Execute a protocol-specific query on a device.

**Endpoint:** `POST /api/queries/execute`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body (SNMP example):**
```json
{
  "deviceId": "uuid",
  "protocol": "snmp",
  "operation": "get",
  "parameters": {
    "oid": "1.3.6.1.2.1.1.1.0"
  }
}
```

**Request Body (WebPA example):**
```json
{
  "deviceId": "uuid",
  "protocol": "webpa",
  "operation": "get",
  "parameters": {
    "parameter": "Device.DeviceInfo.Manufacturer"
  }
}
```

**Request Body (TR-069 example):**
```json
{
  "deviceId": "uuid",
  "protocol": "tr69",
  "operation": "GetParameterValues",
  "parameters": {
    "parameterNames": ["InternetGatewayDevice.DeviceInfo.SoftwareVersion"]
  }
}
```

**Response:** `202 Accepted`
```json
{
  "queryId": "uuid",
  "status": "pending",
  "message": "Query submitted for execution"
}
```

---

### Get Query Result

Retrieve the result of a query execution.

**Endpoint:** `GET /api/queries/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "deviceId": "uuid",
  "protocol": "snmp",
  "operation": "get",
  "parameters": {
    "oid": "1.3.6.1.2.1.1.1.0"
  },
  "status": "completed",
  "result": {
    "value": "Linux Router 5.10.0",
    "type": "string"
  },
  "executedAt": "2024-01-01T12:00:00.000Z",
  "completedAt": "2024-01-01T12:00:02.000Z",
  "duration": 2000
}
```

**Status Values:**
- `pending` - Query submitted but not started
- `running` - Query in progress
- `completed` - Query finished successfully
- `failed` - Query failed
- `timeout` - Query timed out

---

### Get Query History

List query execution history for the authenticated user.

**Endpoint:** `GET /api/queries`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional) - Page number
- `limit` (optional) - Items per page
- `deviceId` (optional) - Filter by device
- `protocol` (optional) - Filter by protocol
- `status` (optional) - Filter by status

**Response:** `200 OK`
```json
{
  "queries": [
    {
      "id": "uuid",
      "deviceId": "uuid",
      "deviceName": "Router-01",
      "protocol": "snmp",
      "operation": "get",
      "status": "completed",
      "executedAt": "2024-01-01T12:00:00.000Z",
      "duration": 2000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## User Management Endpoints

### List Users

Get all users (admin only).

**Endpoint:** `GET /api/users`

**Headers:** `Authorization: Bearer <access_token>`

**Required Role:** `admin`

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role_name": "operator",
      "tenant_id": "uuid",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get User Details

Retrieve specific user information.

**Endpoint:** `GET /api/users/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role_name": "operator",
  "tenant_id": "uuid",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Update User

Update user information.

**Endpoint:** `PUT /api/users/:id`

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "role": "admin"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe Updated",
  "role_name": "admin"
}
```

---

## Health Check Endpoints

### Full Health Check

Check overall system health including database connectivity.

**Endpoint:** `GET /health`

**No authentication required**

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "latency": 5
  },
  "protocols": {
    "snmp": "enabled",
    "webpa": "enabled",
    "tr69": "enabled",
    "tr369": "enabled"
  }
}
```

---

### Readiness Probe

Check if the service is ready to accept requests.

**Endpoint:** `GET /health/ready`

**No authentication required**

**Response:** `200 OK`
```json
{
  "status": "ready"
}
```

---

### Liveness Probe

Check if the service is alive.

**Endpoint:** `GET /health/live`

**No authentication required**

**Response:** `200 OK`
```json
{
  "status": "alive"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `202 Accepted` - Request accepted for processing
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

---

## Rate Limiting

API requests are rate-limited to prevent abuse.

**Default Limits:**
- 100 requests per 15 minutes per IP
- Headers included in response:
  - `X-RateLimit-Limit` - Request limit
  - `X-RateLimit-Remaining` - Remaining requests
  - `X-RateLimit-Reset` - Reset timestamp

**429 Response:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": 900
  }
}
```

---

## WebSocket Support

Real-time updates for query execution status.

**Endpoint:** `ws://localhost:3000` or `wss://api.yourdomain.com`

**Authentication:** Send JWT token after connection:
```json
{
  "type": "auth",
  "token": "your_access_token"
}
```

**Subscribe to Query Updates:**
```json
{
  "type": "subscribe",
  "channel": "query:uuid"
}
```

**Receive Updates:**
```json
{
  "type": "query_update",
  "queryId": "uuid",
  "status": "completed",
  "result": { ... }
}
```

---

## Audit Logging

All API operations are automatically logged for compliance and troubleshooting.

Logged information includes:
- User ID and tenant ID
- Action performed
- Resource accessed
- Timestamp
- Request metadata (IP, user agent)
- Request and response data (excluding sensitive fields)

Audit logs can be accessed via the frontend or database queries.

---

## Support

For API issues or questions:
- Review this documentation
- Check the [README.md](./README.md)
- Review [DEPLOYMENT.md](./DEPLOYMENT.md)
- Open an issue with API request details
