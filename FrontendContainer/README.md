# FrontendContainer

React + TypeScript app scaffolded with Vite.

Scripts:
- npm install
- npm run dev
- npm run build
- npm run preview

Environment:
Copy .env.example to .env and set:
- VITE_API_BASE_URL (required)
- VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID, VITE_OIDC_REDIRECT_URI (optional, for future SSO)

API Client:
- src/services/api.ts uses VITE_API_BASE_URL and injects Authorization header if a token exists in the zustand auth store.

Docker:
- Build: docker build -t drm-frontend .
- Run: docker run -p 8081:80 --env VITE_API_BASE_URL=http://localhost:8080 drm-frontend
  Note: For runtime environment variable replacement, bake env in build or use a reverse proxy in front.

Routing:
- React Router v6 with basic pages: Login, Dashboard, Devices, DeviceDetail, Jobs, MIBBrowser, TR181Browser, Settings, Audit.
