# BackendContainer

FastAPI backend for the Device Remote Management platform.

Features:
- FastAPI app with CORS, JWT auth, and OpenAPI
- Async PostgreSQL via SQLAlchemy + asyncpg
- Tenant context middleware to set PostgreSQL GUCs for Row Level Security:
  - SELECT app.set_current_tenant('<tenant-uuid>'::uuid)
  - SELECT app.set_current_user('<user-uuid>'::uuid)
- Route stubs for auth, tenants, users, devices (CRUD placeholders)
- MIB module upload, parsing (pysmi/pysnmp), and OID browsing with background Celery tasks
- TR-181 parameter catalog with search, tree view, and validation
- **Full protocol client implementations**: SNMP (v2c/v3), WebPA, TR-069 (ECO ACS), USP
- OpenAPI generation endpoint and export CLI

## Quick start

1) Create .env from example and configure:
```
cp .env.example .env
```

2) Install and run:
```
pip install -e .
uvicorn src.main:app --host 0.0.0.0 --port 8080
```

3) Open API docs:
- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc
- OpenAPI JSON: http://localhost:8080/openapi.json

Export to file:
```
python -m src.main --export-openapi openapi.json
```

## Environment variables

See .env.example. Important:
- DATABASE_URL (e.g., postgresql+asyncpg://appuser:dbuser123@localhost:5000/myapp)
- JWT_SECRET
- JWT_EXPIRES_IN (seconds, default 3600)
- CORS_ORIGINS (comma-separated; include FrontendContainer URL, e.g., http://localhost:5173)
- CELERY_BROKER_URL (e.g., redis://redis:6379/0)
- CELERY_RESULT_BACKEND (e.g., redis://redis:6379/1)
- ENABLE_SSE=true|false

### Protocol Client Configuration

#### SNMP Configuration

- **SNMP_DEFAULT_TIMEOUT**: Request timeout in seconds (default: 5.0)
- **SNMP_DEFAULT_RETRIES**: Number of retry attempts (default: 3)
- **SNMP_DEFAULT_PORT**: SNMP port (default: 161)
- **SNMP_MAX_REPETITIONS**: BULKWALK batch size (default: 25)

SNMP client supports:
- **SNMPv2c**: Community-based authentication
- **SNMPv3**: User-based Security Model (USM) with:
  - noAuthNoPriv: No authentication, no encryption
  - authNoPriv: Authentication (MD5/SHA), no encryption
  - authPriv: Authentication + encryption (DES/AES)

Example credential format (stored in `snmp_credentials` table):
```json
{
  "version": "3",
  "username": "snmpuser",
  "auth_protocol": "SHA",
  "auth_password": "authpass123",
  "priv_protocol": "AES",
  "priv_password": "privpass456",
  "port": 161,
  "timeout": 5.0,
  "retries": 3
}
```

#### WebPA Configuration

- **WEBPA_DEFAULT_TIMEOUT**: Request timeout in seconds (default: 30.0)
- **WEBPA_DEFAULT_RETRIES**: Number of retry attempts (default: 3)
- **WEBPA_ENDPOINT**: Optional default WebPA service endpoint

WebPA client supports:
- Basic authentication (username/password)
- Bearer token authentication
- API key authentication
- GET and SET operations on device parameters

Example endpoint format (stored in `webpa_endpoints` table):
```json
{
  "base_url": "http://device-ip:8080",
  "auth": {
    "type": "bearer",
    "token": "your-bearer-token",
    "timeout": 30.0,
    "retries": 3
  }
}
```

#### TR-069 Configuration

- **TR069_DEFAULT_TIMEOUT**: Request timeout in seconds (default: 60.0)
- **TR069_DEFAULT_RETRIES**: Number of retry attempts (default: 3)
- **TR069_ACS_ENDPOINT**: ECO ACS REST API endpoint URL (required for TR-069 operations)
- **TR069_ACS_USERNAME**: Optional ECO ACS API username
- **TR069_ACS_PASSWORD**: Optional ECO ACS API password

TR-069 client wraps ECO ACS REST API and supports:
- GetParameterValues: Retrieve device parameters
- SetParameterValues: Update device parameters
- Download: Firmware/config file downloads
- Device inventory queries

Example endpoint format (stored in `tr069_endpoints` table):
```json
{
  "base_url": "http://acs-server:8080",
  "auth": {
    "type": "basic",
    "username": "acs_admin",
    "password": "acs_password",
    "timeout": 60.0,
    "retries": 3
  }
}
```

#### USP Configuration

- **USP_DEFAULT_TIMEOUT**: Request timeout in seconds (default: 30.0)
- **USP_DEFAULT_RETRIES**: Number of retry attempts (default: 3)
- **USP_CONTROLLER_ENDPOINT**: USP controller REST API endpoint (required for USP operations)
- **USP_TRANSPORT_MODE**: Transport mode - `http`, `mqtt`, or `websocket` (default: http)
- **USP_MQTT_BROKER**: MQTT broker URL (required for MQTT mode)
- **USP_MQTT_PORT**: MQTT broker port (default: 1883)

USP client supports:
- HTTP mode: REST API wrapper (most common)
- MQTT mode: Direct MQTT messaging (future enhancement)
- WebSocket mode: WebSocket transport (future enhancement)
- Get, Set, and Operate commands

Example endpoint format (stored in `usp_endpoints` table):
```json
{
  "base_url": "http://usp-controller:8080",
  "auth": {
    "type": "bearer",
    "token": "your-token",
    "mode": "http",
    "timeout": 30.0,
    "retries": 3
  }
}
```

## Docker

Build and run:
```
docker build -t drm-backend .
docker run --env-file .env -p 8080:8080 drm-backend
```

## Celery worker

Requires Redis accessible via CELERY_BROKER_URL/CELERY_RESULT_BACKEND.

Start API:
```
uvicorn src.main:app --host 0.0.0.0 --port 8080
```

Start worker (from project root of BackendContainer):
```
celery -A src.celery_app.celery_app worker -l info -Q celery
```

Tasks implemented:
- **job.snmp_get**: SNMP GET operation
- **job.snmp_set**: SNMP SET operation
- **job.snmp_bulkwalk**: SNMP BULKWALK operation
- **job.webpa_get**: WebPA GET operation
- **job.webpa_set**: WebPA SET operation
- **job.tr069_get**: TR-069 GetParameterValues
- **job.tr069_set**: TR-069 SetParameterValues
- **job.usp_get**: USP Get operation
- **job.usp_set**: USP Set operation
- **mib.parse_file**: MIB file parsing

Enqueue via API:
- POST /jobs/enqueue/snmp/get
- POST /jobs/enqueue/snmp/set
- POST /jobs/enqueue/snmp/bulkwalk
- POST /jobs/enqueue/webpa/get
- POST /jobs/enqueue/webpa/set
- POST /jobs/enqueue/tr069/get
- POST /jobs/enqueue/tr069/set
- POST /jobs/enqueue/usp/get
- POST /jobs/enqueue/usp/set

Subscribe to progress (SSE):
- GET /jobs/events/{job_id}

## Protocol Clients

### SNMP Client (`src/protocols/snmp_client.py`)

Async SNMP client using pysnmp with support for:
- **GET**: Single OID retrieval
- **SET**: Single OID update
- **BULKWALK**: Bulk OID retrieval for efficient table walks

**Features**:
- SNMPv2c and v3 support
- Configurable timeouts and retries
- Automatic retry with exponential backoff
- Proper error handling and exception types

**Usage**:
```python
from src.protocols.snmp_client import create_snmp_client

params = {
    "host": "192.168.1.1",
    "version": "2c",
    "community": "public"
}
client = create_snmp_client(params)
result = await client.get("1.3.6.1.2.1.1.1.0")
await client.close()
```

### WebPA Client (`src/protocols/webpa_client.py`)

Async HTTP client for WebPA protocol with:
- GET and SET operations
- Multiple authentication modes
- Retry logic and timeout handling

**Features**:
- Basic, Bearer, and API key authentication
- Configurable request timeouts
- Exponential backoff on failures

**Usage**:
```python
from src.protocols.webpa_client import create_webpa_client

auth = {"type": "bearer", "token": "my-token"}
client = create_webpa_client("http://device:8080", auth)
result = await client.get("Device.WiFi.SSID.1.SSID")
await client.close()
```

### TR-069 Client (`src/protocols/tr069_client.py`)

ECO ACS REST API wrapper for TR-069 operations:
- GetParameterValues: Retrieve device parameters
- SetParameterValues: Update device configuration
- Download: Trigger firmware/config downloads
- Device inventory queries

**Features**:
- Async/pending operation handling
- Command tracking with command_id
- Device inventory management

**Usage**:
```python
from src.protocols.tr069_client import create_tr069_client

auth = {"type": "basic", "username": "admin", "password": "pass"}
client = create_tr069_client("http://acs:8080", auth)
result = await client.get_parameter_values("device123", ["Device.DeviceInfo.ModelName"])
await client.close()
```

### USP Client (`src/protocols/usp_client.py`)

USP (TR-369) controller client with:
- Get, Set, and Operate commands
- HTTP, MQTT, and WebSocket transport modes
- Configurable authentication

**Features**:
- Multiple transport modes (HTTP primary)
- Standard USP data model path support
- Command result tracking

**Usage**:
```python
from src.protocols.usp_client import create_usp_client

auth = {"type": "bearer", "token": "token", "mode": "http"}
client = create_usp_client("http://controller:8080", auth)
result = await client.get("device-endpoint", "Device.WiFi.SSID.1.SSID")
await client.close()
```

## Celery Task Integration

All protocol clients are integrated into Celery tasks with:
- **RLS Context**: All DB writes use tenant/user context
- **Error Handling**: Specific exceptions for timeout, auth, and protocol errors
- **Cancellation Support**: Jobs can be cancelled mid-execution
- **Progress Events**: Progress updates stored in job_results
- **Result Storage**: Results stored with proper tenant isolation

Task execution flow:
1. Task receives RLS context (tenant_id, user_id) from API
2. DB session created with RLS context applied
3. Job status updated to "running" with progress
4. Protocol client created and operation executed
5. Cancellation checked periodically
6. Result stored in job_results with RLS context
7. Job status updated to "completed" or "failed"

## RLS tenant context

Middleware extracts tenant_id and user_id from JWT and calls:
```
SELECT app.set_current_tenant($1::uuid);
SELECT app.set_current_user($1::uuid);
```
on each new DB connection/transaction. Update tokens to include these claims: tenant_id, sub.

## Frontend integration

Set Frontend .env:
- VITE_API_BASE_URL=http://localhost:8080

CORS must include the frontend origin so browsers can call the API.

## MIB and TR-181 Features

### MIB Management

Upload and parse SNMP MIB files:
- POST /mib/upload (multipart form: file, optional name)
  - Accepts .mib, .txt, or .tar.gz archives
  - Returns task_id for background parsing via Celery
- GET /mib/modules (list with search, pagination)
- GET /mib/modules/{id} (module details)
- GET /mib/modules/{id}/oids (list OIDs with prefix/name search)
- DELETE /mib/modules/{id} (delete tenant-owned module)

MIB parsing uses pysmi/pysnmp to extract OID definitions and store in mib_modules/mib_oids tables with RLS context.

### TR-181 Parameter Catalog

Manage TR-181 data model parameters:
- POST /tr181/import (import seed data from source)
- GET /tr181/parameters (search by path prefix, type, access, with pagination)
- GET /tr181/tree (hierarchical tree by path segments, root_path query param)
- GET /tr181/parameters/{id} (parameter details)
- POST /tr181/validate (validate proposed parameter sets before applying)

TR-181 data stored in tr181_parameters table with global (NULL tenant_id) and tenant-specific entries.

## Error Handling

Protocol-specific exceptions:
- `SNMPClientError`, `SNMPTimeoutError`, `SNMPAuthError`
- `WebPAClientError`, `WebPATimeoutError`, `WebPAAuthError`
- `TR069ClientError`, `TR069TimeoutError`, `TR069AuthError`
- `USPClientError`, `USPTimeoutError`, `USPAuthError`

All exceptions are caught in Celery tasks and stored in job results with appropriate error types.

## Configuration Notes

1. **SNMP**: No external service required; client connects directly to devices
2. **WebPA**: Requires WebPA service running on devices or gateway
3. **TR-069**: Requires ECO ACS or compatible ACS with REST API
4. **USP**: Requires USP controller with REST API wrapper

Configure endpoints and credentials per-device in respective database tables:
- `snmp_credentials`
- `webpa_endpoints`
- `tr069_endpoints`
- `usp_endpoints`
