"""
WebPA client implementation.

WebPA (Web Protocol for Accessing devices) HTTP client supporting
Basic, Bearer, and API key authentication for GET and SET operations.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional
from dataclasses import dataclass
import httpx


@dataclass
class WebPAConfig:
    """WebPA client configuration."""
    base_url: str
    timeout: float = 30.0
    retries: int = 3
    
    # Authentication
    auth_type: str = "none"  # "none", "basic", "bearer", "apikey"
    username: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None
    api_key: Optional[str] = None
    api_key_header: str = "X-API-Key"


class WebPAClientError(Exception):
    """Base exception for WebPA client errors."""
    pass


class WebPATimeoutError(WebPAClientError):
    """WebPA operation timed out."""
    pass


class WebPAAuthError(WebPAClientError):
    """WebPA authentication failed."""
    pass


class WebPAClient:
    """
    Async WebPA HTTP client.
    
    Supports GET and SET operations on device parameters via HTTP REST API.
    """
    
    def __init__(self, config: WebPAConfig):
        """
        Initialize WebPA client.
        
        Args:
            config: WebPA configuration parameters
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
    
    async def get(self, path: str) -> Dict[str, Any]:
        """
        Perform WebPA GET operation to retrieve parameter value.
        
        Args:
            path: Parameter path (e.g., "Device.WiFi.SSID.1.SSID")
            
        Returns:
            Dictionary with parameter information
            
        Raises:
            WebPAClientError: On operation failure
            WebPATimeoutError: On timeout
            WebPAAuthError: On authentication failure
        """
        client = await self._get_client()
        
        # WebPA typically uses query parameters for GET
        params = {"names": path}
        
        for attempt in range(self.config.retries):
            try:
                response = await client.get("/api/v2/device/config", params=params)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise WebPAAuthError(f"WebPA authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                # WebPA response format: {"parameters": [{"name": "...", "value": "...", "dataType": 0}]}
                if "parameters" in data and len(data["parameters"]) > 0:
                    param = data["parameters"][0]
                    return {
                        "path": param.get("name", path),
                        "value": param.get("value"),
                        "dataType": param.get("dataType", 0),
                        "message": param.get("message", "Success"),
                    }
                
                return {
                    "path": path,
                    "value": None,
                    "message": "No data returned",
                }
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise WebPATimeoutError(f"WebPA GET timeout for {path}: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
                
            except WebPAAuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise WebPAClientError(f"WebPA GET failed for {path}: HTTP {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise WebPAClientError(f"Unexpected error during WebPA GET: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
        
        raise WebPAClientError(f"WebPA GET failed after {self.config.retries} retries")
    
    async def set(self, path: str, value: Any, data_type: int = 0) -> Dict[str, Any]:
        """
        Perform WebPA SET operation to update parameter value.
        
        Args:
            path: Parameter path
            value: New value to set
            data_type: WebPA data type (0=string, 1=int, 2=uint, 3=boolean, etc.)
            
        Returns:
            Dictionary with operation result
            
        Raises:
            WebPAClientError: On operation failure
        """
        client = await self._get_client()
        
        # WebPA SET payload
        payload = {
            "parameters": [
                {
                    "name": path,
                    "value": value,
                    "dataType": data_type,
                }
            ]
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.patch("/api/v2/device/config", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise WebPAAuthError(f"WebPA authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                # Check for success in response
                if "parameters" in data and len(data["parameters"]) > 0:
                    param = data["parameters"][0]
                    return {
                        "path": param.get("name", path),
                        "value": param.get("value", value),
                        "message": param.get("message", "Success"),
                        "success": param.get("statusCode", 200) == 200,
                    }
                
                return {
                    "path": path,
                    "value": value,
                    "message": "SET completed",
                    "success": True,
                }
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise WebPATimeoutError(f"WebPA SET timeout for {path}: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
                
            except WebPAAuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise WebPAClientError(f"WebPA SET failed for {path}: HTTP {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise WebPAClientError(f"Unexpected error during WebPA SET: {e}") from e
                await asyncio.sleep(1 * (attempt + 1))
        
        raise WebPAClientError(f"WebPA SET failed after {self.config.retries} retries")
    
    async def close(self) -> None:
        """Close HTTP client and release resources."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# PUBLIC_INTERFACE
def create_webpa_client(base_url: str, auth: Dict[str, Any]) -> WebPAClient:
    """
    Create WebPA client from configuration.
    
    Args:
        base_url: Base URL of WebPA service (e.g., "http://device-ip:port")
        auth: Authentication configuration dictionary
            Keys:
                - type: "none", "basic", "bearer", or "apikey"
                - username: For basic auth
                - password: For basic auth
                - token: For bearer auth
                - api_key: For API key auth
                - api_key_header: Header name for API key (default "X-API-Key")
                - timeout: Request timeout (default 30.0)
                - retries: Number of retries (default 3)
    
    Returns:
        Configured WebPAClient instance
    """
    config = WebPAConfig(
        base_url=base_url,
        timeout=auth.get("timeout", 30.0),
        retries=auth.get("retries", 3),
        auth_type=auth.get("type", "none"),
        username=auth.get("username"),
        password=auth.get("password"),
        token=auth.get("token"),
        api_key=auth.get("api_key"),
        api_key_header=auth.get("api_key_header", "X-API-Key"),
    )
    return WebPAClient(config)
