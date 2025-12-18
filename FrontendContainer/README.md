# FrontendContainer

React + TypeScript + Vite frontend for the Device Remote Management platform.

## Features

- **Authentication**: JWT-based login with backend integration
- **Device Management**: List, create, update, delete devices
- **Job Management**: Enqueue and monitor SNMP/WebPA/TR-069/USP jobs
- **Real-time Updates**: Server-Sent Events (SSE) for job progress streaming
- **MIB Browser**: Upload, parse, and browse SNMP MIB definitions
- **TR-181 Browser**: Navigate TR-181 data model parameters
- **Multi-tenant Support**: Tenant context switching with X-Tenant-ID header
- **Route Guards**: Protected routes requiring authentication

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Backend API base URL (required)
VITE_API_BASE_URL=http://localhost:8080

# Optional: OIDC/SSO configuration for future integration
VITE_OIDC_AUTHORITY=
VITE_OIDC_CLIENT_ID=
VITE_OIDC_REDIRECT_URI=
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

### 4. Build for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | Yes | `http://localhost:8080` |
| `VITE_OIDC_AUTHORITY` | OIDC provider authority URL | No | - |
| `VITE_OIDC_CLIENT_ID` | OIDC client ID | No | - |
| `VITE_OIDC_REDIRECT_URI` | OIDC redirect URI after login | No | - |

**Important**: Environment variables must be prefixed with `VITE_` to be exposed to the client-side code.

## Authentication Flow

1. **Login**: User submits credentials to `/auth/login` endpoint
2. **Token Storage**: JWT token is stored in Zustand store and localStorage
3. **Request Injection**: API service automatically injects `Authorization: Bearer <token>` header
4. **Tenant Context**: Selected tenant ID is sent via `X-Tenant-ID` header
5. **Route Guards**: Protected routes redirect to `/login` if no token is present
6. **Token Expiration**: 401 responses trigger automatic logout and redirect to login

## API Integration

The `src/services/api.ts` module provides a configured Axios instance:

- Base URL from `VITE_API_BASE_URL`
- Automatic JWT token injection in `Authorization` header
- Automatic tenant ID injection in `X-Tenant-ID` header
- 401 error handling with automatic logout
- 30-second default timeout

Usage example:

```typescript
import { api } from '../services/api';

// GET request
const response = await api().get('/devices');

// POST request
await api().post('/devices', { name: 'Router-01', ip: '192.168.1.1' });
```

## Real-time Updates

### Server-Sent Events (SSE)

Use the `useSSE` hook for real-time job progress updates:

```typescript
import { useSSE, getSSEUrl } from '../utils/realtime';

function JobMonitor({ jobId }: { jobId: string }) {
  const sseUrl = getSSEUrl(`/jobs/events/${jobId}`);
  const { data, error, isConnected } = useSSE(sseUrl);

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### WebSocket

WebSocket client is available for bidirectional communication:

```typescript
import { WebSocketClient } from '../utils/realtime';

const ws = new WebSocketClient('ws://localhost:8080/ws');
ws.connect();
ws.onMessage((data) => console.log('Received:', data));
ws.send({ type: 'ping' });
ws.close();
```

## State Management

The application uses Zustand for state management with persistence:

### Auth Store (`src/store/auth.ts`)

- `token`: JWT token (persisted in localStorage)
- `user`: User object with id, username, email, tenant_id
- `login(token, user)`: Store token and user
- `logout()`: Clear token and user
- `updateUser(user)`: Update user information

### Tenant Store (`src/store/tenant.ts`)

- `tenants`: Array of available tenants
- `selectedTenantId`: Currently selected tenant ID
- `setTenants(tenants)`: Update available tenants
- `selectTenant(tenantId)`: Switch to different tenant
- `clearTenant()`: Clear tenant selection

## Component Structure

### Pages

- **Login** (`src/pages/Login.tsx`): Authentication page
- **Dashboard** (`src/pages/Dashboard.tsx`): Main dashboard
- **Devices** (`src/pages/Devices.tsx`): Device list and management
- **DeviceDetail** (`src/pages/DeviceDetail.tsx`): Single device view
- **Jobs** (`src/pages/Jobs.tsx`): Job queue and monitoring
- **MIBBrowser** (`src/pages/MIBBrowser.tsx`): MIB upload and browsing
- **TR181Browser** (`src/pages/TR181Browser.tsx`): TR-181 parameter browsing
- **Settings** (`src/pages/Settings.tsx`): Application settings
- **Audit** (`src/pages/Audit.tsx`): Audit log viewer

### Components

- **DeviceTable**: Device listing with delete
- **DeviceForm**: Device creation form
- **JobList**: Job queue with real-time updates
- **MIBTree**: MIB module and OID browser
- **TR181Tree**: TR-181 parameter tree
- **TenantSwitcher**: Tenant selection dropdown
- **ResultViewer**: Job result display
- **ProtectedRoute**: Route guard for authentication

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t drm-frontend .

# Run container
docker run -p 3000:80 \
  --env VITE_API_BASE_URL=http://localhost:8080 \
  drm-frontend
```

**Note**: For runtime environment variable replacement in Docker, consider using:
- Multi-stage build with build-time args
- Reverse proxy with environment variable injection
- `envsubst` in entrypoint script

## CORS Configuration

Ensure the backend is configured to allow requests from the frontend origin:

```env
# Backend .env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Development Tips

### Hot Module Replacement (HMR)

Vite provides fast HMR out of the box. Changes to React components will be reflected instantly without full page reload.

### Type Checking

Run TypeScript type checking without emitting files:

```bash
npm run typecheck
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

### Network Access

To access the dev server from other devices on your network:

```bash
npm run dev -- --host 0.0.0.0
```

Then access via `http://<your-ip>:5173`

## Troubleshooting

### API Connection Errors

- Verify `VITE_API_BASE_URL` is correct
- Check backend is running and accessible
- Verify CORS configuration on backend
- Check browser console for detailed error messages

### Authentication Issues

- Clear localStorage: `localStorage.clear()`
- Check JWT token format and expiration
- Verify backend `/auth/login` endpoint is working
- Check Network tab in DevTools for 401 responses

### Build Errors

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check TypeScript errors: `npm run typecheck`

### SSE Connection Issues

- SSE connections don't support custom headers - token is passed as query param
- Check backend SSE endpoint is accessible
- Verify firewall/proxy isn't blocking event streams
- Use browser DevTools Network tab to inspect EventSource connections

## Scripts

- `npm run dev`: Start development server with HMR
- `npm run build`: Build for production (TypeScript + Vite)
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking

## License

[Your License Here]
