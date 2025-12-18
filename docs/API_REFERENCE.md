# API Reference

## Overview

This document describes the HTTP API exposed by the FastAPI backend in `BackendContainer`. It focuses on the routes currently implemented in:

- `src/main.py`
- `src/api/routes/auth.py`
- `src/api/routes/tenants.py`
- `src/api/routes/users.py`
- `src/api/routes/devices.py`
- `src/api/routes/jobs.py`
- `src/api/routes/mib.py`
- `src/api/routes/tr181.py`

The OpenAPI schema is generated at runtime and exposed at:

- `GET /openapi.json`
- `GET /docs` (Swagger UI)
- `GET /redoc`

The examples below assume the API is hosted at `http://localhost:8080`. All tenant‑scoped endpoints rely on JWTs that include `tenant_id` and `sub` claims, which are turned into `request.state.tenant_id` and `request.state.user_id` by `TenantContextMiddleware`.

> **Important:** Several endpoints are currently scaffolds that return placeholder data or do not persist changes. They are clearly identified as such below.

## Authentication and Health

### Health Check

**GET `/health`**

- Summary: Returns a simple health indicator.
- Authentication: Not required.

**Response example:**

```json
{
  "status": "ok"
}
```

### Login

**POST `/auth/login`**

- Summary: Authenticate with email/password and receive a JWT.
- Authentication: Not required.
- Status codes:
  - `200 OK` — on success.
  - `400 Bad Request` — if password is empty.

**Request body (`LoginRequest` from `src/models/schemas.py`):**

```json
{
  "email": "admin@example.com",
  "password": "secret-password"
}
```

**Response body (`TokenResponse`):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

> **Note:** The current implementation in `auth.py` is a scaffold:
> - It does not verify credentials against the `users` table.
> - It mints demo tokens with fixed `tenant_id` and `sub` values.

### Register (Scaffold)

**POST `/auth/register`**

- Summary: Register a new tenant and admin user (placeholder).
- Authentication: Not required.
- Status codes:
  - `200 OK` — returns a token for a demo user.

**Request body (`RegisterRequest`):**

```json
{
  "email": "new-admin@example.com",
  "password": "strong-password",
  "tenant_name": "ExampleTenant"
}
```

**Response body (`TokenResponse`):**

Same shape as `/auth/login`. The tenant and user are not actually persisted in the database in the current implementation.

### WebSocket / SSE Usage Notes

**GET `/docs/websocket-usage`**

- Summary: Returns static notes describing SSE and planned WebSocket usage.

**Response example:**

```json
{
  "websocket": "Future endpoints will be documented with operation_id, tags, and usage.",
  "sse": "Available now at /jobs/events/{job_id}"
}
```

## Tenants

All tenant routes are currently scaffolds that demonstrate RLS‑aware access patterns but do not perform real queries.

### List Tenants (Scaffold)

**GET `/tenants`**

- Summary: List tenants visible to the current user.
- Authentication: Required (JWT).
- RLS: Uses `request.state.tenant_id` and `request.state.user_id`.
- Returns: `[]` (empty list) in the current scaffold.

**Response body (`List[Tenant]`):**

```json
[]
```

Where `Tenant` is:

```json
{
  "id": "uuid-string",
  "name": "Tenant Name",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Create Tenant (Scaffold)

**POST `/tenants`**

- Summary: Create a new tenant (intended for admins).
- Authentication: Required.
- RLS: Uses current tenant/user context but does not persist in the current scaffold.

**Request body (`TenantCreate`):**

```json
{
  "name": "NewTenant"
}
```

**Response body (`Tenant` example):**

```json
{
  "id": "demo",
  "name": "NewTenant",
  "created_at": "1970-01-01T00:00:00Z"
}
```

## Users

### List Users (Scaffold)

**GET `/users`**

- Summary: List users in the current tenant.
- Authentication: Required.
- RLS: Uses `request.state.tenant_id` and `request.state.user_id`.
- Returns: `[]` (empty list) in the current scaffold.

**Response body (`List[User]`):**

```json
[]
```

Where `User` is:

```json
{
  "id": "uuid-string",
  "tenant_id": "uuid-string",
  "email": "user@example.com",
  "role": "admin",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Create User (Scaffold)

**POST `/users`**

- Summary: Create a new user within the current tenant.
- Authentication: Required.
- Status codes:
  - `201 Created` — on success.
  - `400 Bad Request` — if email is missing.

**Request body (`UserCreate`):**

```json
{
  "email": "new-user@example.com",
  "password": "strong-password",
  "role": "user"
}
```

**Response body (`User` example):**

```json
{
  "id": "demo-user",
  "tenant_id": "demo-tenant",
  "email": "new-user@example.com",
  "role": "user",
  "created_at": "1970-01-01T00:00:00Z"
}
```

## Devices

### List Devices (Scaffold)

**GET `/devices`**

- Summary: List devices scoped to the current tenant.
- Authentication: Required.
- RLS: Uses `request.state.tenant_id` and `request.state.user_id`.
- Returns: `[]` in the scaffold.

**Response body (`List[Device]`):**

```json
[]
```

Where `Device` is:

```json
{
  "id": "uuid-string",
  "tenant_id": "uuid-string",
  "name": "Router-01",
  "ip": "192.168.1.1",
  "metadata": {
    "model": "ExampleModel"
  },
  "created_by": "user-uuid",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Create Device (Scaffold)

**POST `/devices`**

- Summary: Register a new device.
- Authentication: Required.
- RLS: Uses `request.state.tenant_id` and `request.state.user_id`.

**Request body (`DeviceCreate`):**

```json
{
  "name": "Router-01",
  "ip": "192.168.1.1",
  "metadata": {
    "location": "Lab A",
    "vendor": "ExampleVendor"
  }
}
```

**Response body (`Device` example):**

```json
{
  "id": "demo-device",
  "tenant_id": "demo-tenant",
  "name": "Router-01",
  "ip": "192.168.1.1",
  "metadata": {
    "location": "Lab A",
    "vendor": "ExampleVendor"
  },
  "created_by": "user-uuid-or-null",
  "created_at": "1970-01-01T00:00:00Z"
}
```

> **Note:** There is no `GET /devices/{id}` endpoint implemented yet, even though the frontend’s `DeviceDetail` component expects one.

## Jobs and Server‑Sent Events

### Enqueue SNMP GET Job

**POST `/jobs/enqueue/snmp/get`**

- Summary: Enqueue an SNMP GET job for a single OID.
- Authentication: Required.
- RLS: Requires both `tenant_id` and `user_id` to be present on the request state.
- Status codes:
  - `202 Accepted` — job enqueued.
  - `401 Unauthorized` — if tenant or user context is missing.

**Request body (`EnqueueSNMPGet`):**

```json
{
  "device_ip": "127.0.0.1",
  "oid": "1.3.6.1.2.1.1.1.0",
  "cred": {
    "version": "2c",
    "community": "public",
    "port": 161,
    "timeout": 5.0,
    "retries": 3
  }
}
```

**Response body:**

```json
{
  "job_id": "d8c9eae9-4f2d-4dd9-a5e0-1e6c9b3e1234",
  "status": "queued"
}
```

### Enqueue WebPA GET Job

**POST `/jobs/enqueue/webpa/get`**

**Request body (`EnqueueWebPAGet`):**

```json
{
  "endpoint": {
    "base_url": "http://device-host:8080",
    "auth": {
      "type": "bearer",
      "token": "token-value",
      "timeout": 30.0,
      "retries": 3
    }
  },
  "path": "Device.WiFi.SSID.1.SSID"
}
```

**Response body:**

```json
{
  "job_id": "uuid-string",
  "status": "queued"
}
```

### Enqueue TR‑069 GET Job

**POST `/jobs/enqueue/tr069/get`**

**Request body (`EnqueueTR069Get`):**

```json
{
  "endpoint": {
    "base_url": "http://acs-server:8080",
    "auth": {
      "type": "basic",
      "username": "acs_admin",
      "password": "acs_password",
      "timeout": 60.0,
      "retries": 3
    }
  },
  "parameter": "Device.DeviceInfo.ModelName"
}
```

**Response body:**

```json
{
  "job_id": "uuid-string",
  "status": "queued"
}
```

### Enqueue USP GET Job

**POST `/jobs/enqueue/usp/get`**

**Request body (`EnqueueUSPGet`):**

```json
{
  "endpoint": {
    "base_url": "http://usp-controller:8080",
    "auth": {
      "type": "bearer",
      "token": "token-value",
      "mode": "http",
      "timeout": 30.0,
      "retries": 3
    }
  },
  "path": "Device.WiFi.SSID.1.SSID"
}
```

**Response body:**

```json
{
  "job_id": "uuid-string",
  "status": "queued"
}
```

> **Note:** There are Celery tasks for SNMP SET/BULKWALK and WebPA/TR‑069/USP SET operations, but there are no corresponding HTTP enqueue endpoints implemented yet.

### Subscribe to Job Events (SSE)

**GET `/jobs/events/{job_id}`**

- Summary: Stream job status updates via Server‑Sent Events (SSE).
- Authentication: Required; uses `TenantContextMiddleware`.
- Status codes:
  - `200 OK` — SSE stream if `ENABLE_SSE` is true.
  - `404 Not Found` — if SSE is disabled via configuration.
- Events:
  - `update` — emitted when status changes, with `status` and `result`.
  - `done` — emitted when job reaches `"completed"` or `"failed"`.

**Example event stream:**

```text
event: update
data: {"status":"running","result":{"status":"running","result":{}}}

event: done
data: {
  "status": "completed",
  "result": {
    "status": "completed",
    "result": {
      "protocol": "snmp",
      "operation": "get",
      "oid": "1.3.6.1.2.1.1.1.0",
      "result": "Example sysDescr"
    }
  }
}
```

The frontend’s `useSSE` hook in `src/utils/realtime.ts` connects to this endpoint and updates the job list or result viewer accordingly.

## MIB Management

### Upload MIB File

**POST `/mib/upload`**

- Summary: Upload a MIB file for background parsing.
- Authentication: Required (tenant context).
- Accepted file types:
  - `.mib`
  - `.txt`
  - `.gz` (if part of a `.tar.gz` archive)
- Status codes:
  - `202 Accepted` — when parsing is enqueued.
  - `400 Bad Request` — if tenant context is missing or file type is invalid.
  - `500 Internal Server Error` — on IO or enqueue failures.

**Request (multipart/form‑data):**

- `file` — MIB file upload (required).
- `name` — optional module name override.

Example using `curl`:

```bash
curl -X POST http://localhost:8080/mib/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@RFC1213-MIB.mib"
```

**Response body (`MIBUploadResponse`):**

```json
{
  "message": "MIB file uploaded and queued for parsing",
  "task_id": "celery-task-id",
  "module_id": null
}
```

### List MIB Modules

**GET `/mib/modules`**

- Summary: List MIB modules accessible to the current tenant (tenant‑specific and global).
- Authentication: Required.

**Query parameters:**

- `search` (optional) — search by module name (case‑insensitive).
- `page` (default `1`, `>=1`)
- `page_size` (default `20`, `1–100`)

**Response body (`MIBModuleList`):**

```json
{
  "items": [
    {
      "id": "uuid-module-id",
      "tenant_id": null,
      "name": "RFC1213-MIB",
      "file_path": null,
      "metadata": {
        "file_size": 12345,
        "oid_count": 2
      },
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

### Get MIB Module Details

**GET `/mib/modules/{module_id}`**

- Summary: Retrieve one MIB module by id, ensuring tenant or global visibility.

**Response body (`MIBModule`):**

```json
{
  "id": "uuid-module-id",
  "tenant_id": null,
  "name": "RFC1213-MIB",
  "file_path": null,
  "metadata": {
    "file_size": 12345,
    "oid_count": 2
  },
  "created_at": "2024-01-01T12:00:00Z"
}
```

### List OIDs for a Module

**GET `/mib/modules/{module_id}/oids`**

- Summary: List OIDs associated with a given MIB module.
- Authentication: Required.

**Query parameters:**

- `oid_prefix` (optional) — filter by OID prefix, e.g. `1.3.6.1`.
- `name_search` (optional) — `ILIKE` search on `name`.
- `page` (default `1`, `>=1`)
- `page_size` (default `50`, `1–200`)

**Response body (`MIBOIDList`):**

```json
{
  "items": [
    {
      "id": "uuid-oid-id",
      "module_id": "uuid-module-id",
      "oid": "1.3.6.1.2.1.1.1.0",
      "name": "sysDescr",
      "syntax": "OCTET STRING",
      "access": "read-only",
      "description": "A textual description of the entity.",
      "parent_oid": null,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50
}
```

### Delete MIB Module

**DELETE `/mib/modules/{module_id}`**

- Summary: Delete a tenant‑owned MIB module and all associated OIDs.
- Authentication: Required.
- Status codes:
  - `204 No Content` — on success.
  - `400 Bad Request` — if tenant context is missing.
  - `404 Not Found` — if module is not found or not owned by the tenant.

This endpoint only allows deletion of modules where `tenant_id` equals the current tenant; global modules cannot be deleted.

## TR‑181 Parameter Catalog

### Import TR‑181 Seed Data

**POST `/tr181/import`**

- Summary: Import seed TR‑181 parameters into the database.
- Authentication: Required.

**Request body (`TR181ImportRequest`):**

```json
{
  "source": "builtin",
  "overwrite": false
}
```

**Response body (`TR181ImportResponse`):**

```json
{
  "message": "Successfully imported 7 parameters",
  "imported_count": 7
}
```

> **Note:** The current implementation uses built‑in example parameters defined in `src/tr181/catalog.py`. A full Broadband Forum import is not yet implemented.

### Search TR‑181 Parameters

**GET `/tr181/parameters`**

- Summary: Search parameters with flexible filters.
- Authentication: Required.

**Query parameters:**

- `path_prefix` (optional) — e.g. `Device.WiFi`.
- `param_type` (optional) — e.g. `string`, `boolean`, `unsignedInt`.
- `access` (optional) — e.g. `readOnly`, `readWrite`.
- `search` (optional) — substring search on `path` or `description`.
- `page` (default `1`, `>=1`)
- `page_size` (default `50`, `1–200`)

**Response body (`TR181ParameterList`):**

```json
{
  "items": [
    {
      "id": "uuid-param-id",
      "tenant_id": null,
      "path": "Device.DeviceInfo.Manufacturer",
      "schema": {
        "type": "string",
        "access": "readOnly",
        "description": "Device manufacturer name"
      },
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50
}
```

### Get TR‑181 Parameter Tree

**GET `/tr181/tree`**

- Summary: Build a hierarchical tree of parameters from a root path.
- Authentication: Required.

**Query parameters:**

- `root_path` (default `"Device"`) — path prefix to build the tree from.

**Response body (`TR181TreeNode`):**

```json
{
  "path": "Device",
  "name": "Device",
  "schema": {},
  "children": [
    {
      "path": "Device.DeviceInfo",
      "name": "DeviceInfo",
      "schema": {},
      "children": [
        {
          "path": "Device.DeviceInfo.Manufacturer",
          "name": "Manufacturer",
          "schema": {
            "type": "string",
            "access": "readOnly",
            "description": "Device manufacturer name"
          },
          "children": [],
          "is_leaf": true
        }
      ],
      "is_leaf": false
    }
  ],
  "is_leaf": false
}
```

This output schema is used by the frontend `TR181Tree` component, although the component currently assumes a slightly different shape; see `ARCHITECTURE.md` for details on this mismatch.

### Get TR‑181 Parameter by ID

**GET `/tr181/parameters/{param_id}`**

- Summary: Retrieve a single parameter by id, respecting tenant/global scope.

**Response body (`TR181Parameter`):**

```json
{
  "id": "uuid-param-id",
  "tenant_id": null,
  "path": "Device.DeviceInfo.Manufacturer",
  "schema": {
    "type": "string",
    "access": "readOnly",
    "description": "Device manufacturer name"
  },
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Validate TR‑181 Parameter Set

**POST `/tr181/validate`**

- Summary: Validate a set of parameter paths and values before applying them.
- Authentication: Required.

**Request body (`TR181ValidationRequest`):**

```json
{
  "parameters": {
    "Device.WiFi.Radio.1.Enable": true,
    "Device.WiFi.Radio.1.Channel": 6
  }
}
```

**Response body (`TR181ValidationResponse`):**

On success:

```json
{
  "valid": true,
  "errors": []
}
```

On validation errors:

```json
{
  "valid": false,
  "errors": [
    {
      "path": "Device.WiFi.Radio.1.Channel",
      "error": "Expected integer, got string"
    }
  ]
}
```

Validation logic is implemented in `src/tr181/catalog.py` and checks:

- That paths exist.
- That parameters are writable (not read‑only).
- That JSON value types are consistent with the expected schema types.

## Notes on Missing or Future Endpoints

- The frontend assumes a `GET /jobs` endpoint returning a list of jobs and a `GET /devices/{id}` endpoint for device details. These are not yet implemented in the backend.
- RBAC and API key management are supported at the schema level but do not have dedicated REST endpoints at this time.
- WebSocket endpoints are planned but not implemented; all real‑time consumption currently happens through SSE at `/jobs/events/{job_id}`.

For the most accurate and up‑to‑date contract, you can export the OpenAPI schema using:

```bash
cd BackendContainer
python -m src.main --export-openapi openapi.json
```

This will generate `openapi.json` based on the running code in `src/main.py` and the included routers.
