# Frontend Container - Device Remote Management Platform

Modern React frontend built with Vite for the Device Remote Management platform.

## Features

- **Authentication UI**
  - Login and registration pages
  - JWT token management with automatic refresh
  - Protected routes with authentication guards

- **Device Management**
  - List, create, edit, and delete devices
  - Device detail views with protocol information
  - Advanced filtering and search

- **Query Builder**
  - Interactive query builder for SNMP, WebPA, TR-069, TR-369
  - Real-time query execution status
  - Protocol-specific parameter inputs

- **Query History**
  - View past query executions
  - Filter by device and status
  - Detailed execution information

- **Audit Logs**
  - System activity tracking
  - User action trail
  - Filterable log views

- **Dashboard**
  - Overview statistics
  - Quick actions
  - Recent activity

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router 6** - Client-side routing
- **Zustand** - State management
- **React Hook Form** - Form handling and validation
- **Axios** - HTTP client with interceptors
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (BackendContainer)

## Quick Start

### 1. Install Dependencies

```bash
cd FrontendContainer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your API URLs
```

**Important environment variables:**
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)
- `VITE_WS_URL` - WebSocket URL for real-time features (default: ws://localhost:3000)

### 3. Start Development Server

```bash
# Using startup script (recommended)
bash startup.sh

# Or directly with npm
npm run dev
```

The app will start on `http://localhost:5173`

## Build for Production

```bash
npm run build
```

Build output will be in the `dist/` directory.

Preview production build:
```bash
npm run preview
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t device-mgmt-frontend .
```

### Run Container

```bash
docker run -p 80:80 device-mgmt-frontend
```

The app will be available at `http://localhost`

## Project Structure

```
FrontendContainer/
├── src/
│   ├── main.jsx                 # Application entry point
│   ├── App.jsx                  # Main app component with routing
│   ├── index.css                # Global styles with Tailwind
│   ├── components/              # Reusable components
│   │   ├── Layout/
│   │   │   └── Layout.jsx       # Main layout wrapper
│   │   ├── Navigation/
│   │   │   └── Navigation.jsx   # Navigation bar
│   │   └── UI/
│   │       ├── LoadingSpinner.jsx
│   │       └── ErrorMessage.jsx
│   ├── pages/                   # Page components
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx
│   │   ├── Devices/
│   │   │   ├── DeviceList.jsx
│   │   │   ├── DeviceDetail.jsx
│   │   │   ├── DeviceCreate.jsx
│   │   │   └── DeviceEdit.jsx
│   │   ├── Queries/
│   │   │   ├── QueryBuilder.jsx
│   │   │   └── QueryHistory.jsx
│   │   ├── AuditLogs/
│   │   │   └── AuditLogs.jsx
│   │   └── Health/
│   │       └── Health.jsx
│   ├── services/                # API services
│   │   ├── api.js               # Axios client with interceptors
│   │   ├── authService.js       # Authentication API
│   │   ├── deviceService.js     # Device CRUD API
│   │   ├── queryService.js      # Query execution API
│   │   ├── protocolService.js   # Protocol configuration API
│   │   └── auditService.js      # Audit logs API
│   └── store/                   # State management
│       └── authStore.js         # Authentication state (Zustand)
├── public/                      # Static assets
├── index.html                   # HTML entry point
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── .eslintrc.cjs               # ESLint configuration
├── Dockerfile                   # Docker build configuration
├── nginx.conf                   # Nginx config for production
├── .env.example                 # Environment variables template
├── package.json                 # Dependencies and scripts
├── startup.sh                   # Development startup script
└── README.md                    # This file
```

## API Integration

The frontend connects to the backend API using axios with automatic JWT token management.

### API Client Features

- Automatic access token attachment to requests
- Automatic token refresh on 401 errors
- Request/response interceptors
- Error handling

### Environment Configuration

Set backend API URL in `.env`:
```
VITE_API_URL=http://localhost:3000
```

## Authentication Flow

1. User logs in via `/login`
2. Backend returns access token and refresh token
3. Access token stored in Zustand store (persisted to localStorage)
4. All API requests include access token in Authorization header
5. On 401 error, automatically refresh token
6. If refresh fails, redirect to login

## Available Routes

### Public Routes
- `/login` - Login page
- `/register` - Registration page
- `/health` - Health check page

### Protected Routes (require authentication)
- `/dashboard` - Dashboard overview
- `/devices` - Device list
- `/devices/new` - Create device
- `/devices/:id` - Device details
- `/devices/:id/edit` - Edit device
- `/queries` - Query builder
- `/queries/history` - Query history
- `/audit-logs` - Audit logs

## Styling

The app uses Tailwind CSS for styling with custom utility classes defined in `src/index.css`:

- `.btn` - Base button styles
- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary button
- `.btn-danger` - Destructive action button
- `.input` - Form input styles
- `.card` - Card container
- `.table-container` - Table wrapper
- `.table` - Table styles

## Form Validation

Forms use `react-hook-form` for validation:

```jsx
const { register, handleSubmit, formState: { errors } } = useForm();

<input
  {...register('email', {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email'
    }
  })}
/>
{errors.email && <p>{errors.email.message}</p>}
```

## State Management

Authentication state is managed with Zustand and persisted to localStorage:

```jsx
import { useAuthStore } from './store/authStore';

const { user, isAuthenticated, setAuth, logout } = useAuthStore();
```

## Development Tips

### Hot Module Replacement
Vite provides fast HMR. Changes to components will reflect instantly without full page reload.

### Proxy Configuration
API requests are proxied in development (see `vite.config.js`):
```js
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

### Debugging
- React DevTools extension recommended
- Zustand DevTools for state inspection
- Network tab for API calls

## Production Considerations

✅ **Checklist before deployment:**
- [ ] Set correct `VITE_API_URL` in production environment
- [ ] Enable HTTPS
- [ ] Configure CORS on backend for production domain
- [ ] Optimize build with `npm run build`
- [ ] Set up CDN for static assets
- [ ] Configure proper cache headers (handled by nginx.conf)
- [ ] Enable gzip compression (handled by nginx.conf)
- [ ] Set security headers (handled by nginx.conf)

## Troubleshooting

### Port Already in Use
Change port in `vite.config.js`:
```js
server: {
  port: 5174
}
```

### API Connection Failed
1. Verify backend is running
2. Check `VITE_API_URL` in `.env`
3. Verify CORS is enabled on backend
4. Check network tab in browser DevTools

### Build Errors
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check Node.js version: `node --version` (should be 18+)

## License

MIT
