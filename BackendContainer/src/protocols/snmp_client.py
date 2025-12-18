"""
SNMP client implementation supporting v2c and v3 (authNoPriv, authPriv).

Uses pysnmp with async support for GET, SET, and BULKWALK operations.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass

from pysnmp.hlapi.asyncio import (
    CommunityData,
    ContextData,
    ObjectIdentity,
    ObjectType,
    SnmpEngine,
    UdpTransportTarget,
    UsmUserData,
    bulkCmd,
    getCmd,
    setCmd,
    usmHMACMD5AuthProtocol,
    usmHMACSHAAuthProtocol,
    usmDESPrivProtocol,
    usmAesCfb128Protocol,
    usmNoAuthProtocol,
    usmNoPrivProtocol,
)


@dataclass
class SNMPConfig:
    """SNMP client configuration."""
    host: str
    port: int = 161
    timeout: float = 5.0
    retries: int = 3
    version: str = "2c"  # "2c" or "3"
    
    # v2c parameters
    community: str = "public"
    
    # v3 parameters
    username: Optional[str] = None
    auth_protocol: Optional[str] = None  # "MD5", "SHA", or None
    auth_password: Optional[str] = None
    priv_protocol: Optional[str] = None  # "DES", "AES", or None
    priv_password: Optional[str] = None
    
    # BULKWALK parameters
    max_repetitions: int = 25


class SNMPClientError(Exception):
    """Base exception for SNMP client errors."""
    pass


class SNMPTimeoutError(SNMPClientError):
    """SNMP operation timed out."""
    pass


class SNMPAuthError(SNMPClientError):
    """SNMP authentication failed."""
    pass


class SNMPClient:
    """
    Async SNMP client supporting v2c and v3.
    
    Supports GET, SET, and BULKWALK operations with configurable
    timeouts, retries, and authentication modes.
    """
    
    def __init__(self, config: SNMPConfig):
        """
        Initialize SNMP client.
        
        Args:
            config: SNMP configuration parameters
        """
        self.config = config
        self.engine = SnmpEngine()
        
    def _get_auth_data(self) -> CommunityData | UsmUserData:
        """Build authentication data based on version and config."""
        if self.config.version == "2c":
            return CommunityData(self.config.community, mpModel=1)
        elif self.config.version == "3":
            # SNMPv3 with User-based Security Model
            auth_proto = usmNoAuthProtocol
            priv_proto = usmNoPrivProtocol
            
            if self.config.auth_protocol:
                if self.config.auth_protocol.upper() == "MD5":
                    auth_proto = usmHMACMD5AuthProtocol
                elif self.config.auth_protocol.upper() == "SHA":
                    auth_proto = usmHMACSHAAuthProtocol
                    
            if self.config.priv_protocol:
                if self.config.priv_protocol.upper() == "DES":
                    priv_proto = usmDESPrivProtocol
                elif self.config.priv_protocol.upper() == "AES":
                    priv_proto = usmAesCfb128Protocol
                    
            return UsmUserData(
                self.config.username or "user",
                authKey=self.config.auth_password,
                privKey=self.config.priv_password,
                authProtocol=auth_proto,
                privProtocol=priv_proto,
            )
        else:
            raise SNMPClientError(f"Unsupported SNMP version: {self.config.version}")
    
    def _get_transport_target(self) -> UdpTransportTarget:
        """Build UDP transport target."""
        return UdpTransportTarget(
            (self.config.host, self.config.port),
            timeout=self.config.timeout,
            retries=self.config.retries,
        )
    
    async def get(self, oid: str) -> Dict[str, Any]:
        """
        Perform SNMP GET operation.
        
        Args:
            oid: Object identifier to query (e.g., "1.3.6.1.2.1.1.1.0")
            
        Returns:
            Dictionary with oid, value, and type information
            
        Raises:
            SNMPClientError: On SNMP operation failure
            SNMPTimeoutError: On timeout
            SNMPAuthError: On authentication failure
        """
        auth_data = self._get_auth_data()
        transport = self._get_transport_target()
        
        try:
            error_indication, error_status, error_index, var_binds = await getCmd(
                self.engine,
                auth_data,
                transport,
                ContextData(),
                ObjectType(ObjectIdentity(oid)),
            )
            
            if error_indication:
                if "timeout" in str(error_indication).lower():
                    raise SNMPTimeoutError(f"SNMP GET timeout for {oid}: {error_indication}")
                elif "auth" in str(error_indication).lower():
                    raise SNMPAuthError(f"SNMP authentication failed: {error_indication}")
                else:
                    raise SNMPClientError(f"SNMP GET failed for {oid}: {error_indication}")
                    
            if error_status:
                raise SNMPClientError(
                    f"SNMP GET error: {error_status.prettyPrint()} at {error_index and var_binds[int(error_index) - 1][0] or '?'}"
                )
            
            # Extract result
            for var_bind in var_binds:
                oid_obj, value = var_bind
                return {
                    "oid": str(oid_obj),
                    "value": str(value),
                    "type": value.__class__.__name__,
                }
            
            raise SNMPClientError("No data returned from SNMP GET")
            
        except (SNMPTimeoutError, SNMPAuthError, SNMPClientError):
            raise
        except Exception as e:
            raise SNMPClientError(f"Unexpected error during SNMP GET: {e}") from e
    
    async def set(self, oid: str, value: Any, value_type: str = "OctetString") -> Dict[str, Any]:
        """
        Perform SNMP SET operation.
        
        Args:
            oid: Object identifier to set
            value: Value to set
            value_type: SNMP value type (OctetString, Integer, IpAddress, etc.)
            
        Returns:
            Dictionary with result information
            
        Raises:
            SNMPClientError: On SNMP operation failure
        """
        from pysnmp.proto.rfc1902 import (
            Counter32, Counter64, Gauge32, Integer, Integer32,
            IpAddress, OctetString, TimeTicks, Unsigned32
        )
        
        # Map type string to pysnmp type
        type_map = {
            "OctetString": OctetString,
            "Integer": Integer,
            "Integer32": Integer32,
            "Counter32": Counter32,
            "Counter64": Counter64,
            "Gauge32": Gauge32,
            "Unsigned32": Unsigned32,
            "TimeTicks": TimeTicks,
            "IpAddress": IpAddress,
        }
        
        value_class = type_map.get(value_type, OctetString)
        
        auth_data = self._get_auth_data()
        transport = self._get_transport_target()
        
        try:
            error_indication, error_status, error_index, var_binds = await setCmd(
                self.engine,
                auth_data,
                transport,
                ContextData(),
                ObjectType(ObjectIdentity(oid), value_class(value)),
            )
            
            if error_indication:
                if "timeout" in str(error_indication).lower():
                    raise SNMPTimeoutError(f"SNMP SET timeout for {oid}: {error_indication}")
                elif "auth" in str(error_indication).lower():
                    raise SNMPAuthError(f"SNMP authentication failed: {error_indication}")
                else:
                    raise SNMPClientError(f"SNMP SET failed for {oid}: {error_indication}")
                    
            if error_status:
                raise SNMPClientError(
                    f"SNMP SET error: {error_status.prettyPrint()} at {error_index and var_binds[int(error_index) - 1][0] or '?'}"
                )
            
            # Extract result
            for var_bind in var_binds:
                oid_obj, val = var_bind
                return {
                    "oid": str(oid_obj),
                    "value": str(val),
                    "type": val.__class__.__name__,
                    "success": True,
                }
            
            raise SNMPClientError("No confirmation from SNMP SET")
            
        except (SNMPTimeoutError, SNMPAuthError, SNMPClientError):
            raise
        except Exception as e:
            raise SNMPClientError(f"Unexpected error during SNMP SET: {e}") from e
    
    async def bulk_walk(self, oid: str, max_rows: int = 100) -> List[Dict[str, Any]]:
        """
        Perform SNMP BULKWALK operation to retrieve multiple OIDs.
        
        Args:
            oid: Starting OID for the walk
            max_rows: Maximum number of rows to retrieve
            
        Returns:
            List of dictionaries with oid, value, and type information
            
        Raises:
            SNMPClientError: On SNMP operation failure
        """
        auth_data = self._get_auth_data()
        transport = self._get_transport_target()
        
        results = []
        
        try:
            async for (error_indication, error_status, error_index, var_binds) in bulkCmd(
                self.engine,
                auth_data,
                transport,
                ContextData(),
                0,  # Non-repeaters
                self.config.max_repetitions,  # Max-repetitions
                ObjectType(ObjectIdentity(oid)),
                lexicographicMode=False,
            ):
                if error_indication:
                    if "timeout" in str(error_indication).lower():
                        raise SNMPTimeoutError(f"SNMP BULKWALK timeout: {error_indication}")
                    elif "auth" in str(error_indication).lower():
                        raise SNMPAuthError(f"SNMP authentication failed: {error_indication}")
                    else:
                        raise SNMPClientError(f"SNMP BULKWALK failed: {error_indication}")
                        
                if error_status:
                    raise SNMPClientError(
                        f"SNMP BULKWALK error: {error_status.prettyPrint()} at {error_index and var_binds[int(error_index) - 1][0] or '?'}"
                    )
                
                for var_bind in var_binds:
                    oid_obj, value = var_bind
                    results.append({
                        "oid": str(oid_obj),
                        "value": str(value),
                        "type": value.__class__.__name__,
                    })
                    
                if len(results) >= max_rows:
                    break
            
            return results
            
        except (SNMPTimeoutError, SNMPAuthError, SNMPClientError):
            raise
        except Exception as e:
            raise SNMPClientError(f"Unexpected error during SNMP BULKWALK: {e}") from e
    
    async def close(self) -> None:
        """Close SNMP engine and release resources."""
        # pysnmp doesn't require explicit cleanup in most cases
        pass


# PUBLIC_INTERFACE
def create_snmp_client(params: Dict[str, Any]) -> SNMPClient:
    """
    Create SNMP client from parameter dictionary.
    
    Args:
        params: Dictionary containing SNMP configuration
            Required keys:
                - host: Target device IP/hostname
            Optional keys:
                - port: SNMP port (default 161)
                - timeout: Request timeout in seconds (default 5.0)
                - retries: Number of retries (default 3)
                - version: "2c" or "3" (default "2c")
                - community: Community string for v2c (default "public")
                - username: Username for v3
                - auth_protocol: "MD5" or "SHA" for v3
                - auth_password: Auth password for v3
                - priv_protocol: "DES" or "AES" for v3
                - priv_password: Privacy password for v3
                - max_repetitions: BULKWALK batch size (default 25)
    
    Returns:
        Configured SNMPClient instance
    """
    config = SNMPConfig(
        host=params["host"],
        port=params.get("port", 161),
        timeout=params.get("timeout", 5.0),
        retries=params.get("retries", 3),
        version=params.get("version", "2c"),
        community=params.get("community", "public"),
        username=params.get("username"),
        auth_protocol=params.get("auth_protocol"),
        auth_password=params.get("auth_password"),
        priv_protocol=params.get("priv_protocol"),
        priv_password=params.get("priv_password"),
        max_repetitions=params.get("max_repetitions", 25),
    )
    return SNMPClient(config)
