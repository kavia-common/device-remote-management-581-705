import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

let instance: AxiosInstance | null = null;

function createInstance(): AxiosInstance {
  const ax = axios.create({
    baseURL,
    timeout: 30000
  });

  // Inject Authorization header if token exists
  ax.interceptors.request.use((config: AxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
    }
    return config;
  });

  // Basic error handling
  ax.interceptors.response.use(
    (resp: AxiosResponse) => resp,
    (error) => {
      if (error?.response?.status === 401) {
        // Optionally trigger logout or redirect to login
        // useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }
  );

  return ax;
}

// PUBLIC_INTERFACE
export function api(): AxiosInstance {
  /** Returns a singleton Axios instance configured with base URL and auth token injection. */
  if (!instance) instance = createInstance();
  return instance;
}
