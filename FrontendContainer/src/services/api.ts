import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/auth';
import { useTenantStore } from '../store/tenant';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

let instance: AxiosInstance | null = null;

function createInstance(): AxiosInstance {
  const ax = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Inject Authorization header and tenant context if available
  ax.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    const tenantId = useTenantStore.getState().selectedTenantId;
    
    if (!config.headers) {
      config.headers = {} as any;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Include tenant context if available (backend expects X-Tenant-ID header)
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    
    return config;
  });

  // Handle authentication errors and token expiration
  ax.interceptors.response.use(
    (resp: AxiosResponse) => resp,
    (error) => {
      if (error?.response?.status === 401) {
        // Clear auth state on unauthorized
        useAuthStore.getState().logout();
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return ax;
}

// PUBLIC_INTERFACE
export function api(): AxiosInstance {
  /** Returns a singleton Axios instance configured with base URL, auth token, and tenant context injection. */
  if (!instance) instance = createInstance();
  return instance;
}

// PUBLIC_INTERFACE
export function resetApiInstance(): void {
  /** Reset the API instance (useful after logout or config changes). */
  instance = null;
}
