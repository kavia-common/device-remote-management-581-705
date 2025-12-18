"""
TR-069 client implementation using ECO ACS REST API.

Wraps ECO ACS REST endpoints for common TR-069 operations including
GetParameterValues, SetParameterValues, Download, and device inventory queries.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import httpx


@dataclass
class TR069Config:
    """TR-069 ACS client configuration."""
    base_url: str  # ECO ACS REST API base URL
    timeout: float = 60.0  # TR-069 operations can be slow
    retries: int = 3
    
    # Authentication
    auth_type: str = "basic"  # "basic", "bearer", "apikey"
    username: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None
    api_key: Optional[str] = None
    api_key_header: str = "X-API-Key"


class TR069ClientError(Exception):
    """Base exception for TR-069 client errors."""
    pass


class TR069TimeoutError(TR069ClientError):
    """TR-069 operation timed out."""
    pass


class TR069AuthError(TR069ClientError):
    """TR-069 authentication failed."""
    pass


class TR069Client:
    """
    Async TR-069 client using ECO ACS REST API.
    
    Provides high-level interface for TR-069 device management operations.
    """
    
    def __init__(self, config: TR069Config):
        """
        Initialize TR-069 client.
        
        Args:
            config: TR-069 configuration parameters
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
    
    async def get_parameter_values(
        self, device_id: str, parameters: List[str]
    ) -> Dict[str, Any]:
        """
        Execute GetParameterValues RPC on device.
        
        Args:
            device_id: Device identifier in ACS
            parameters: List of parameter paths to retrieve
            
        Returns:
            Dictionary with parameter values
            
        Raises:
            TR069ClientError: On operation failure
            TR069TimeoutError: On timeout
            TR069AuthError: On authentication failure
        """
        client = await self._get_client()
        
        # ECO ACS REST API format for GetParameterValues
        payload = {
            "device_id": device_id,
            "command": "GetParameterValues",
            "parameters": parameters,
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.post("/api/v1/devices/command", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise TR069AuthError(f"TR-069 authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                # ECO ACS response format
                if "status" in data and data["status"] == "success":
                    return {
                        "device_id": device_id,
                        "parameters": data.get("parameters", {}),
                        "message": data.get("message", "Success"),
                    }
                
                # Handle pending status (TR-069 is async)
                if data.get("status") == "pending":
                    # Could implement polling here, for now return pending status
                    return {
                        "device_id": device_id,
                        "parameters": {},
                        "message": "Command pending",
                        "pending": True,
                        "command_id": data.get("command_id"),
                    }
                
                raise TR069ClientError(f"TR-069 GetParameterValues failed: {data.get('message', 'Unknown error')}")
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise TR069TimeoutError(f"TR-069 GetParameterValues timeout: {e}") from e
                await asyncio.sleep(2 * (attempt + 1))
                
            except TR069AuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise TR069ClientError(f"TR-069 HTTP error: {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise TR069ClientError(f"Unexpected error during TR-069 operation: {e}") from e
                await asyncio.sleep(2 * (attempt + 1))
        
        raise TR069ClientError(f"TR-069 GetParameterValues failed after {self.config.retries} retries")
    
    async def set_parameter_values(
        self, device_id: str, parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute SetParameterValues RPC on device.
        
        Args:
            device_id: Device identifier in ACS
            parameters: Dictionary mapping parameter paths to values
            
        Returns:
            Dictionary with operation result
            
        Raises:
            TR069ClientError: On operation failure
        """
        client = await self._get_client()
        
        # ECO ACS REST API format for SetParameterValues
        payload = {
            "device_id": device_id,
            "command": "SetParameterValues",
            "parameters": [
                {"name": name, "value": value}
                for name, value in parameters.items()
            ],
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.post("/api/v1/devices/command", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise TR069AuthError(f"TR-069 authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                if "status" in data and data["status"] in ["success", "pending"]:
                    return {
                        "device_id": device_id,
                        "message": data.get("message", "Success"),
                        "success": data["status"] == "success",
                        "pending": data["status"] == "pending",
                        "command_id": data.get("command_id"),
                    }
                
                raise TR069ClientError(f"TR-069 SetParameterValues failed: {data.get('message', 'Unknown error')}")
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise TR069TimeoutError(f"TR-069 SetParameterValues timeout: {e}") from e
                await asyncio.sleep(2 * (attempt + 1))
                
            except TR069AuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise TR069ClientError(f"TR-069 HTTP error: {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise TR069ClientError(f"Unexpected error during TR-069 operation: {e}") from e
                await asyncio.sleep(2 * (attempt + 1))
        
        raise TR069ClientError(f"TR-069 SetParameterValues failed after {self.config.retries} retries")
    
    async def download(
        self, device_id: str, file_type: str, url: str, username: str = "", password: str = ""
    ) -> Dict[str, Any]:
        """
        Execute Download RPC on device (firmware upgrade, config file, etc.).
        
        Args:
            device_id: Device identifier in ACS
            file_type: Type of file (e.g., "1 Firmware Upgrade Image", "3 Vendor Configuration File")
            url: URL to download from
            username: Optional username for file server auth
            password: Optional password for file server auth
            
        Returns:
            Dictionary with download status
            
        Raises:
            TR069ClientError: On operation failure
        """
        client = await self._get_client()
        
        payload = {
            "device_id": device_id,
            "command": "Download",
            "file_type": file_type,
            "url": url,
            "username": username,
            "password": password,
        }
        
        for attempt in range(self.config.retries):
            try:
                response = await client.post("/api/v1/devices/command", json=payload)
                
                if response.status_code == 401 or response.status_code == 403:
                    raise TR069AuthError(f"TR-069 authentication failed: {response.status_code}")
                
                response.raise_for_status()
                
                data = response.json()
                
                return {
                    "device_id": device_id,
                    "status": data.get("status", "unknown"),
                    "message": data.get("message", "Download initiated"),
                    "command_id": data.get("command_id"),
                }
                
            except httpx.TimeoutException as e:
                if attempt == self.config.retries - 1:
                    raise TR069TimeoutError(f"TR-069 Download timeout: {e}") from e
                await asyncio.sleep(2 * (attempt + 1))
                
            except TR069AuthError:
                raise
                
            except httpx.HTTPStatusError as e:
                raise TR069ClientError(f"TR-069 HTTP error: {e.response.status_code}") from e
                
            except Exception as e:
                if attempt == self.config.retries - 1:
                    raise TR069ClientError(f"Unexpected error during TR-069 operation: {e}") from e
                await asyncio.sleep(2 * (attempt + 1))
        
        raise TR069ClientError(f"TR-069 Download failed after {self.config.retries} retries")
    
    async def get_device_info(self, device_id: str) -> Dict[str, Any]:
        """
        Query device inventory information from ACS.
        
        Args:
            device_id: Device identifier in ACS
            
        Returns:
            Dictionary with device information
            
        Raises:
            TR069ClientError: On query failure
        """
        client = await self._get_client()
        
        try:
            response = await client.get(f"/api/v1/devices/{device_id}")
            
            if response.status_code == 401 or response.status_code == 403:
                raise TR069AuthError(f"TR-069 authentication failed: {response.status_code}")
            
            if response.status_code == 404:
                raise TR069ClientError(f"Device {device_id} not found in ACS")
            
            response.raise_for_status()
            
            return response.json()
            
        except TR069AuthError:
            raise
            
        except httpx.HTTPStatusError as e:
            raise TR069ClientError(f"TR-069 device query failed: HTTP {e.response.status_code}") from e
            
        except Exception as e:
            raise TR069ClientError(f"Unexpected error querying device info: {e}") from e
    
    async def list_devices(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Query device inventory list from ACS.
        
        Args:
            filters: Optional filters for device query
            
        Returns:
            List of device information dictionaries
            
        Raises:
            TR069ClientError: On query failure
        """
        client = await self._get_client()
        
        try:
            params = filters or {}
            response = await client.get("/api/v1/devices", params=params)
            
            if response.status_code == 401 or response.status_code == 403:
                raise TR069AuthError(f"TR-069 authentication failed: {response.status_code}")
            
            response.raise_for_status()
            
            data = response.json()
            return data.get("devices", [])
            
        except TR069AuthError:
            raise
            
        except httpx.HTTPStatusError as e:
            raise TR069ClientError(f"TR-069 device list query failed: HTTP {e.response.status_code}") from e
            
        except Exception as e:
            raise TR069ClientError(f"Unexpected error querying device list: {e}") from e
    
    async def close(self) -> None:
        """Close HTTP client and release resources."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# PUBLIC_INTERFACE
def create_tr069_client(base_url: str, auth: Dict[str, Any]) -> TR069Client:
    """
    Create TR-069 client from configuration.
    
    Args:
        base_url: ECO ACS REST API base URL
        auth: Authentication configuration dictionary
            Keys:
                - type: "basic", "bearer", or "apikey"
                - username: For basic auth
                - password: For basic auth
                - token: For bearer auth
                - api_key: For API key auth
                - api_key_header: Header name for API key (default "X-API-Key")
                - timeout: Request timeout (default 60.0)
                - retries: Number of retries (default 3)
    
    Returns:
        Configured TR069Client instance
    """
    config = TR069Config(
        base_url=base_url,
        timeout=auth.get("timeout", 60.0),
        retries=auth.get("retries", 3),
        auth_type=auth.get("type", "basic"),
        username=auth.get("username"),
        password=auth.get("password"),
        token=auth.get("token"),
        api_key=auth.get("api_key"),
        api_key_header=auth.get("api_key_header", "X-API-Key"),
    )
    return TR069Client(config)
