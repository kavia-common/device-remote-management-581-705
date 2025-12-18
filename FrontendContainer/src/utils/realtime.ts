//
// Placeholder for future Server-Sent Events (SSE) and WebSocket helpers.
// This file will be extended when backend endpoints are available.
//

// PUBLIC_INTERFACE
export function getSSEUrl(path: string): string {
  /** Build full SSE URL from relative path using API base URL. */
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
  return `${base}/${path.replace(/^\/+/, '')}`;
}
