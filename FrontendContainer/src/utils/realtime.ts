import { useEffect, useRef, useState } from 'react';

// PUBLIC_INTERFACE
export function getSSEUrl(path: string): string {
  /** Build full SSE URL from relative path using API base URL. */
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? '';
  return `${base}/${path.replace(/^\/+/, '')}`;
}

// PUBLIC_INTERFACE
export function useSSE<T = any>(url: string | null, enabled: boolean = true) {
  /**
   * React hook for Server-Sent Events (SSE) connection.
   * Returns the latest event data and connection state.
   * 
   * @param url - The SSE endpoint URL (null to disable)
   * @param enabled - Whether the connection should be active
   */
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url || !enabled) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    // Note: EventSource doesn't support custom headers, so we pass token as query param
    const urlWithToken = token ? `${url}?token=${token}` : url;

    const eventSource = new EventSource(urlWithToken);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError(new Error('SSE connection failed'));
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [url, enabled]);

  return { data, error, isConnected };
}

// PUBLIC_INTERFACE
export class WebSocketClient {
  /**
   * WebSocket client for real-time bidirectional communication.
   * Handles reconnection and message queuing.
   */
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private onMessageCallback?: (data: any) => void;
  private onErrorCallback?: (error: Error) => void;
  private onConnectCallback?: () => void;

  constructor(url: string) {
    this.url = url;
  }

  // PUBLIC_INTERFACE
  connect(): void {
    /** Establish WebSocket connection with authentication token. */
    const token = localStorage.getItem('auth_token');
    const urlWithToken = token ? `${this.url}?token=${token}` : this.url;

    this.ws = new WebSocket(urlWithToken);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) this.send(msg);
      }
      if (this.onConnectCallback) {
        this.onConnectCallback();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(data);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('WebSocket connection failed'));
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect();
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`Attempting to reconnect in ${delay}ms...`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error('Failed to reconnect after multiple attempts'));
      }
    }
  }

  // PUBLIC_INTERFACE
  send(data: string | object): void {
    /** Send message through WebSocket, queuing if not connected. */
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
    }
  }

  // PUBLIC_INTERFACE
  onMessage(callback: (data: any) => void): void {
    /** Register callback for incoming messages. */
    this.onMessageCallback = callback;
  }

  // PUBLIC_INTERFACE
  onError(callback: (error: Error) => void): void {
    /** Register callback for errors. */
    this.onErrorCallback = callback;
  }

  // PUBLIC_INTERFACE
  onConnect(callback: () => void): void {
    /** Register callback for successful connection. */
    this.onConnectCallback = callback;
  }

  // PUBLIC_INTERFACE
  close(): void {
    /** Close WebSocket connection and prevent reconnection. */
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // PUBLIC_INTERFACE
  isConnected(): boolean {
    /** Check if WebSocket is currently connected. */
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
