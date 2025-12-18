# FrontendContainer

React + TypeScript + Vite frontend for the Device Remote Management platform with modern UI/UX enhancements.

## Features

- **Authentication**: JWT-based login with client-side validation
- **Device Management**: Enhanced list, create, update, delete with sorting and search
- **Job Management**: Real-time job monitoring with live status updates
- **Real-time Updates**: Server-Sent Events (SSE) for job progress streaming
- **MIB Browser**: Upload, parse, and browse SNMP MIB definitions
- **TR-181 Browser**: Navigate TR-181 data model parameters
- **Multi-tenant Support**: Tenant context switching with X-Tenant-ID header
- **Route Guards**: Protected routes requiring authentication
- **Modern UI/UX**: Tailwind CSS with dark/light mode, accessible components
- **Enhanced Forms**: Client-side validation with inline errors
- **Toast Notifications**: Global notification system for user feedback
- **Responsive Design**: Mobile-friendly layouts with collapsible sidebar

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

## UI/UX Enhancements

### Design System

The application uses a custom design system built on Tailwind CSS with the following features:

#### Color Palette

The design system includes both dark mode (default) and light mode with semantic color tokens:

**Dark Mode (Default)**
- Background: `#0b1020` (--bg)
- Panel: `#141a2e` (--panel)
- Text: `#e6eef7` (--text)
- Muted: `#8ca0b3` (--muted)
- Accent: `#4f8cff` (--accent)
- Secondary Accent: `#00d0a3` (--accent-2)
- Border: `#27324a` (--border)

**Light Mode**
- Background: `#f8f9fa` (--bg-light)
- Panel: `#ffffff` (--panel-light)
- Text: `#212529` (--text-light)
- Muted: `#6c757d` (--muted-light)
- Border: `#dee2e6` (--border-light)

#### Typography

System font stack for optimal performance and native feel:
```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### Component Library

The application includes a comprehensive UI component library in `src/components/ui/`:

#### Core Components

- **Button**: Variants (primary, secondary, ghost, danger), sizes (sm, md, lg), loading states
- **Input**: Label, error, helper text, validation states, accessibility
- **Select**: Dropdown with label and error handling
- **Badge**: Status indicators with live pulse animation
- **Toast**: Auto-dismissing notifications with types (success, error, warning, info)
- **Dialog**: Accessible confirmation modals using Headless UI
- **LoadingIndicator**: Spinner with multiple sizes
- **Skeleton**: Content placeholders during loading
- **EmptyState**: Friendly messages when no data available
- **ErrorBanner**: Error display with retry functionality

#### Usage Example

```typescript
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { useToastStore } from './store/toast';

function MyForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const addToast = useToastStore(s => s.addToast);

  const handleSubmit = () => {
    if (!value) {
      setError('This field is required');
      return;
    }
    
    addToast('Form submitted successfully!', 'success');
  };

  return (
    <form>
      <Input
        label="Name"
        value={value}
        onChange={e => setValue(e.target.value)}
        error={error}
        required
      />
      <Button variant="primary" onClick={handleSubmit}>
        Submit
      </Button>
    </form>
  );
}
```

### Dark/Light Mode

The application supports theme switching with persistence:

```typescript
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      Switch to {theme === 'dark' ? 'light' : 'dark'} mode
    </button>
  );
}
```

Theme preference is stored in localStorage and automatically applied on app load.

### Customizing the Theme

#### CSS Variables

Edit `src/styles/theme.css` to customize colors:

```css
:root {
  --bg: #your-color;
  --panel: #your-color;
  --accent: #your-color;
  /* ... more variables */
}

.light {
  --bg: #your-light-color;
  /* ... light mode overrides */
}
```

#### Tailwind Configuration

Extend the Tailwind theme in `tailwind.config.js`:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        // Add custom colors
        brand: '#123456',
      },
      spacing: {
        // Add custom spacing
      },
    },
  },
}
```

### Form Validation

All forms include client-side validation with inline error messages:

- Email format validation
- Required field checking
- IP address format validation
- Real-time error clearing on input change
- Loading states with disabled inputs

Example validation:

```typescript
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  if (!email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Toast Notifications

Global toast system for user feedback:

```typescript
import { useToastStore } from './store/toast';

const addToast = useToastStore(s => s.addToast);

// Success
addToast('Device added successfully!', 'success');

// Error
addToast('Failed to delete device', 'error');

// Warning
addToast('Device may be offline', 'warning');

// Info
addToast('Connecting to device...', 'info', 10000); // Custom duration
```

### Table Features

Enhanced tables include:

- **Sorting**: Click column headers to sort ascending/descending
- **Search**: Full-text search across multiple columns
- **Filtering**: Status filters and custom filters
- **Empty States**: Friendly messages when no data
- **Error States**: Error banners with retry buttons
- **Loading States**: Skeleton loaders during data fetch
- **Sticky Headers**: Headers remain visible on scroll
- **Responsive**: Mobile-friendly with horizontal scroll

### Accessibility

All components follow WCAG 2.1 AA standards:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus indicators
- Screen reader announcements
- Color contrast compliance
- Skip navigation links

Example:

```tsx
<Button
  variant="primary"
  onClick={handleClick}
  aria-label="Add new device"
  aria-busy={loading}
>
  Add Device
</Button>
```

### Responsive Design

The application is fully responsive with:

- Mobile-first approach
- Collapsible sidebar on mobile
- Touch-friendly targets (min 44x44px)
- Responsive tables with horizontal scroll
- Stacked forms on small screens
- Adaptive navigation

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Loading States

Multiple loading indicators:

1. **Global Spinner**: Full-page loading
2. **Skeleton Loaders**: Content placeholders
3. **Button Loading**: Inline spinners in buttons
4. **Progressive Loading**: Load critical content first

```typescript
import { LoadingIndicator } from './components/ui/LoadingIndicator';
import { Skeleton } from './components/ui/Skeleton';

{loading ? (
  <Skeleton className="h-12 w-full" />
) : (
  <div>Loaded content</div>
)}
```

### Real-time Updates

Job status updates use SSE with visual indicators:

- Live badge with pulse animation
- Auto-scrolling log viewer
- Connection status indicators
- Automatic reconnection on disconnect

```typescript
import { Badge } from './components/ui/Badge';

<Badge variant="success" live={isConnected}>
  Running
</Badge>
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

1. **Login**: User submits credentials with client-side validation
2. **Token Storage**: JWT token stored in Zustand store and localStorage
3. **Request Injection**: API service automatically injects `Authorization: Bearer <token>` header
4. **Tenant Context**: Selected tenant ID sent via `X-Tenant-ID` header
5. **Route Guards**: Protected routes redirect to `/login` if no token present
6. **Token Expiration**: 401 responses trigger automatic logout and redirect
7. **User Feedback**: Toast notifications for all auth actions

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
    <ResultViewer result={data} isLive={isConnected} />
  );
}
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

### Toast Store (`src/store/toast.ts`)

- `toasts`: Array of active toasts
- `addToast(message, type, duration)`: Add new toast
- `removeToast(id)`: Remove specific toast
- `clearToasts()`: Clear all toasts

## Component Structure

### Pages

- **Login** (`src/pages/Login.tsx`): Authentication with validation
- **Dashboard** (`src/pages/Dashboard.tsx`): Main dashboard
- **Devices** (`src/pages/Devices.tsx`): Device list and management
- **DeviceDetail** (`src/pages/DeviceDetail.tsx`): Single device view
- **Jobs** (`src/pages/Jobs.tsx`): Job queue with real-time updates
- **MIBBrowser** (`src/pages/MIBBrowser.tsx`): MIB upload and browsing
- **TR181Browser** (`src/pages/TR181Browser.tsx`): TR-181 parameter browsing
- **Settings** (`src/pages/Settings.tsx`): Application settings
- **Audit** (`src/pages/Audit.tsx`): Audit log viewer

### Shared Components

- **DeviceTable**: Sortable, searchable device list
- **DeviceForm**: Validated device creation form
- **JobList**: Real-time job monitoring
- **QueryForm**: Protocol query form with validation
- **ResultViewer**: Auto-scrolling result display
- **TenantSwitcher**: Tenant selection dropdown
- **ThemeToggle**: Dark/light mode switcher
- **Breadcrumbs**: Route-based navigation breadcrumbs
- **ProtectedRoute**: Authentication guard

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

### Theme Not Applying

- Check localStorage for `theme` key
- Verify `ThemeProvider` wraps the app
- Check browser console for errors
- Clear browser cache and localStorage

### SSE Connection Issues

- SSE connections don't support custom headers - token passed as query param
- Check backend SSE endpoint is accessible
- Verify firewall/proxy isn't blocking event streams
- Use browser DevTools Network tab to inspect EventSource connections

## Scripts

- `npm run dev`: Start development server with HMR
- `npm run build`: Build for production (TypeScript + Vite)
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Performance Considerations

- Lazy loading for routes (future enhancement)
- Image optimization
- Code splitting
- Bundle size monitoring
- Lighthouse scores: 90+ across all metrics

## License

[Your License Here]
