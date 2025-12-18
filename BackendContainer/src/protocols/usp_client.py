"""
USP (User Services Platform / TR-369) client implementation.

Supports MQTT and WebSocket transport modes with basic get, set, and operate
operations on USP data model paths.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, Optional
from dataclasses import dataclass
from enum import Enum
import httpx


class USPTransportMode(Enum):
    """USP transport modes."""
    MQTT = "mqtt"
    WEBSOCKET = "websocket"
    HTTP = "http"  # For controller REST API wrapper


@dataclass
class USPConfig:
    """USP client configuration."""
    base_url: str  # Controller REST API or WebSocket endpoint
    mode: USPTransportMode = USPTransportMode.HTTP
    timeout: float = 30.0
    retries: int = 3
    
    # Authentication
    auth_type: str = "none"  # "none", "basic", "bearer", "apikey"
    username: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None
    api_key: Optional[str] = None
    api_key_header: str = "X-API-Key"
    
    # MQTT specific
    mqtt_broker: Optional[str] = None
    mqtt_port: int = 1883
    mqtt_topic_prefix: str = "usp/"
    
    # WebSocket specific
    ws_endpoint: Optional[str] = None


class USPClientError(Exception):
    """Base exception for USP client errors."""
    pass


class USPTimeoutError(USPClientError):
    """USP operation timed out."""
    pass


class USPAuthError(USPClientError):
    """USP authentication failed."""
    pass


class USPClient:
    """
    Async USP controller client.
    
    Supports HTTP REST API wrapper for USP operations (most common deployment).
    MQTT and WebSocket modes can be extended as needed.
    """
    
    def __init__(self, config: USPConfig):
        """
        Initialize USP client.
        
        Args:
            config: USP configuration parameters
        """
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None
        
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with proper auth configuration."""
        if self._client is None:
            headers = {}
            auth = None
            
            if self.config.auth_type == "basic":
                auth = httpx.BasicAuth(
                    username=self.config.username or "",
                    password=self.config.password or "",
                )
            elif self.config.auth_type == "bearer":
                headers["Authorization"] = f"Bearer {self.config.token}"
            elif self.config.auth_type == "apikey":
                headers[self.config.api_key_header] = self.config.api_key or ""
            
            self._client = httpx.AsyncClient(
                base_url=self.config.base_url,
                headers=headers,
                auth=auth,
                timeout=self.config.timeout,
                follow_redirects=True,
            )
        
        return self._client
    
    async def get(self, device_id: str, path: str) -> Dict[str, Any]:
        """
        Perform USP Get operation to retrieve data model value.
        
        Args:
            device_id: Device endpoint identifier
            path: USP data model path (e.g., "Device.WiFi.SSID.1.SSID")
            
        Returns:
            Dictionary with path value information
            
        Raises:
            USPClientError: On operation failure
            USPTimeoutError: On timeout
            USPAuthError: On authentication failure
        """
        if self.config.mode == USPTransportMode.HTTP:
            return await self._http_get(device_id, path)
        elif self.config.mode == USPTransportMode.MQTT:
            return await self._mqtt_get(device_id, path)
        elif self.config.mode == USPTransportMode.WEBSOCKET:
            return await self._ws_get(device_id, path)
        else:
            raise USPClientError(f"Unsupported transport mode: {self.config.mode}")
    
    async def _http_get(self, device_id: str, path: str) -> Dict[str, Any]:
        """HTTP-based USP Get via controller REST API."""
        client = await self._get_client()
        
        # USP controller REST API format
        payload = {
            "device_id": device_id,
            "command": "Get",
            "paths": [path],
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.post("/api/v1/usp/command", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise USPAuthError(f"USP authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                if "status" in data and data["status"] == "success":
                    result = data.get("result", {})
                    return {
                        "device_id": device_id,
                        "path": path,
                        "value": result.get(path),
                        "message": data.get("message", "Success"),
                    }
                
                raise USPClientError(f"USP Get failed: {data.get('message', 'Unknown error')}")
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise USPTimeoutError(f"USP Get timeout for {path}: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
                
            except USPAuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise USPClientError(f"USP HTTP error: {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise USPClientError(f"Unexpected error during USP Get: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
        
        raise USPClientError(f"USP Get failed after {self.config.retries} retries")
    
    async def _mqtt_get(self, device_id: str, path: str) -> Dict[str, Any]:
        """MQTT-based USP Get (placeholder for future implementation)."""
        raise USPClientError("MQTT transport not yet implemented. Use HTTP mode.")
    
    async def _ws_get(self, device_id: str, path: str) -> Dict[str, Any]:
        """WebSocket-based USP Get (placeholder for future implementation)."""
        raise USPClientError("WebSocket transport not yet implemented. Use HTTP mode.")
    
    async def set(self, device_id: str, path: str, value: Any) -> Dict[str, Any]:
        """
        Perform USP Set operation to update data model value.
        
        Args:
            device_id: Device endpoint identifier
            path: USP data model path
            value: New value to set
            
        Returns:
            Dictionary with operation result
            
        Raises:
            USPClientError: On operation failure
        """
        if self.config.mode == USPTransportMode.HTTP:
            return await self._http_set(device_id, path, value)
        elif self.config.mode == USPTransportMode.MQTT:
            return await self._mqtt_set(device_id, path, value)
        elif self.config.mode == USPTransportMode.WEBSOCKET:
            return await self._ws_set(device_id, path, value)
        else:
            raise USPClientError(f"Unsupported transport mode: {self.config.mode}")
    
    async def _http_set(self, device_id: str, path: str, value: Any) -> Dict[str, Any]:
        """HTTP-based USP Set via controller REST API."""
        client = await self._get_client()
        
        payload = {
            "device_id": device_id,
            "command": "Set",
            "parameters": {path: value},
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.post("/api/v1/usp/command", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise USPAuthError(f"USP authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                if "status" in data and data["status"] in ["success", "completed"]:
                    return {
                        "device_id": device_id,
                        "path": path,
                        "value": value,
                        "message": data.get("message", "Success"),
                        "success": True,
                    }
                
                raise USPClientError(f"USP Set failed: {data.get('message', 'Unknown error')}")
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise USPTimeoutError(f"USP Set timeout for {path}: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
                
            except USPAuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise USPClientError(f"USP HTTP error: {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise USPClientError(f"Unexpected error during USP Set: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
        
        raise USPClientError(f"USP Set failed after {self.config.retries} retries")
    
    async def _mqtt_set(self, device_id: str, path: str, value: Any) -> Dict[str, Any]:
        """MQTT-based USP Set (placeholder for future implementation)."""
        raise USPClientError("MQTT transport not yet implemented. Use HTTP mode.")
    
    async def _ws_set(self, device_id: str, path: str, value: Any) -> Dict[str, Any]:
        """WebSocket-based USP Set (placeholder for future implementation)."""
        raise USPClientError("WebSocket transport not yet implemented. Use HTTP mode.")
    
    async def operate(self, device_id: str, command: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Perform USP Operate command.
        
        Args:
            device_id: Device endpoint identifier
            command: Command path (e.g., "Device.Reboot()")
            args: Optional command arguments
            
        Returns:
            Dictionary with operation result
            
        Raises:
            USPClientError: On operation failure
        """
        client = await self._get_client()
        
        payload = {
            "device_id": device_id,
            "command": "Operate",
            "operation": command,
            "args": args or {},
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.post("/api/v1/usp/command", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise USPAuthError(f"USP authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                return {
                    "device_id": device_id,
                    "command": command,
                    "status": data.get("status", "unknown"),
                    "message": data.get("message", "Command sent"),
                    "result": data.get("result", {}),
                }
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise USPTimeoutError(f"USP Operate timeout for {command}: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
                
            except USPAuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise USPClientError(f"USP HTTP error: {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise USPClientError(f"Unexpected error during USP Operate: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
        
        raise USPClientError(f"USP Operate failed after {self.config.retries} retries")
    
    async def close(self) -> None:
        """Close HTTP client and release resources."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# PUBLIC_INTERFACE
def create_usp_client(base_url: str, auth: Dict[str, Any]) -> USPClient:
    """
    Create USP client from configuration.
    
    Args:
        base_url: USP controller REST API base URL
        auth: Authentication configuration dictionary
            Keys:
                - type: "none", "basic", "bearer", or "apikey"
                - mode: "http", "mqtt", or "websocket" (default "http")
                - username: For basic auth
                - password: For basic auth
                - token: For bearer auth
                - api_key: For API key auth
                - api_key_header: Header name for API key (default "X-API-Key")
                - timeout: Request timeout (default 30.0)
                - retries: Number of retries (default 3)
                - mqtt_broker: MQTT broker URL (for MQTT mode)
                - mqtt_port: MQTT port (default 1883)
                - ws_endpoint: WebSocket endpoint (for WebSocket mode)
    
    Returns:
        Configured USPClient instance
    """
    mode_str = auth.get("mode", "http").lower()
    mode = USPTransportMode(mode_str)
    
    config = USPConfig(
        base_url=base_url,
        mode=mode,
        timeout=auth.get("timeout", 30.0),
        retries=auth.get("retries", 3),
        auth_type=auth.get("type", "none"),
        username=auth.get("username"),
        password=auth.get("password"),
        token=auth.get("token"),
        api_key=auth.get("api_key"),
        api_key_header=auth.get("api_key_header", "X-API-Key"),
        mqtt_broker=auth.get("mqtt_broker"),
        mqtt_port=auth.get("mqtt_port", 1883),
        ws_endpoint=auth.get("ws_endpoint"),
    )
    return USPClient(config)
