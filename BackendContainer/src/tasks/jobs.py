from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, Optional
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.celery_app import RLSTask, celery_app
from src.db.session import get_db_session
from src.protocols.snmp_client import create_snmp_client, SNMPClientError, SNMPTimeoutError, SNMPAuthError
from src.protocols.webpa_client import create_webpa_client, WebPAClientError, WebPATimeoutError, WebPAAuthError
from src.protocols.tr069_client import create_tr069_client, TR069ClientError, TR069TimeoutError, TR069AuthError
from src.protocols.usp_client import create_usp_client, USPClientError, USPTimeoutError, USPAuthError


async def _update_job_status(
    session: AsyncSession, 
    job_id: str, 
    status: str, 
    details: Optional[Dict[str, Any]] = None,
    progress: Optional[int] = None,
) -> None:
    """
    Update job status and optionally store results with RLS context.
    
    Args:
        session: Database session with RLS context applied
        job_id: Job UUID
        status: New status (pending, running, completed, failed, cancelled)
        details: Optional result data to store in job_results
        progress: Optional progress percentage (0-100)
    """
    # Update job status
    update_params: Dict[str, Any] = {
        "status": status,
        "job_id": job_id,
        "updated_at": datetime.now(timezone.utc),
    }
    
    await session.execute(
        text("UPDATE jobs SET status=:status, updated_at=:updated_at WHERE id=:job_id::uuid"),
        update_params,
    )
    
    # Store results if provided
    if details is not None:
        # Ensure RLS context is available for job_results insert
        result_data = {
            "result": details,
            "progress": progress,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await session.execute(
            text(
                "INSERT INTO job_results(id, tenant_id, job_id, result, created_at) "
                "VALUES (gen_random_uuid(), current_setting('app.tenant_id')::uuid, :job_id::uuid, :result::jsonb, now()) "
                "ON CONFLICT (job_id) DO UPDATE SET result = EXCLUDED.result"
            ),
            {"job_id": job_id, "result": json.dumps(result_data)},
        )
    
    await session.commit()


async def _check_cancellation(session: AsyncSession, job_id: str) -> bool:
    """
    Check if job has been cancelled.
    
    Args:
        session: Database session
        job_id: Job UUID
        
    Returns:
        True if job status is 'cancelled'
    """
    result = await session.execute(
        text("SELECT status FROM jobs WHERE id=:job_id::uuid"),
        {"job_id": job_id},
    )
    row = result.fetchone()
    return row is not None and row[0] == "cancelled"


@celery_app.task(bind=True, base=RLSTask, name="job.snmp_get")
def snmp_get(self: RLSTask, job_id: str, device_ip: str, oid: str, cred: Dict[str, Any]) -> str:
    """
    Execute SNMP GET operation on device.
    
    Args:
        job_id: Job UUID for tracking
        device_ip: Target device IP address
        oid: SNMP OID to query
        cred: SNMP credentials dictionary
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                # Check for cancellation
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                # Build SNMP client params
                params = {
                    "host": device_ip,
                    "port": cred.get("port", 161),
                    "version": cred.get("version", "2c"),
                    "timeout": cred.get("timeout", 5.0),
                    "retries": cred.get("retries", 3),
                }
                
                # Add version-specific params
                if params["version"] == "2c":
                    params["community"] = cred.get("community", "public")
                elif params["version"] == "3":
                    params.update({
                        "username": cred.get("username"),
                        "auth_protocol": cred.get("auth_protocol"),
                        "auth_password": cred.get("auth_password"),
                        "priv_protocol": cred.get("priv_protocol"),
                        "priv_password": cred.get("priv_password"),
                    })
                
                client = create_snmp_client(params)
                
                await _update_job_status(session, job_id, "running", progress=50)
                
                # Perform GET
                result = await client.get(oid)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "snmp",
                        "operation": "get",
                        "oid": oid,
                        "result": result,
                    },
                    progress=100,
                )
                
            except SNMPTimeoutError as e:
                await _update_job_status(
                    session, 
                    job_id, 
                    "failed", 
                    {"error": "timeout", "message": str(e)},
                )
            except SNMPAuthError as e:
                await _update_job_status(
                    session, 
                    job_id, 
                    "failed", 
                    {"error": "authentication", "message": str(e)},
                )
            except SNMPClientError as e:
                await _update_job_status(
                    session, 
                    job_id, 
                    "failed", 
                    {"error": "snmp_error", "message": str(e)},
                )
            except Exception as e:
                await _update_job_status(
                    session, 
                    job_id, 
                    "failed", 
                    {"error": "unexpected", "message": str(e)},
                )
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.snmp_set")
def snmp_set(self: RLSTask, job_id: str, device_ip: str, oid: str, value: Any, value_type: str, cred: Dict[str, Any]) -> str:
    """
    Execute SNMP SET operation on device.
    
    Args:
        job_id: Job UUID for tracking
        device_ip: Target device IP address
        oid: SNMP OID to set
        value: Value to set
        value_type: SNMP value type
        cred: SNMP credentials dictionary
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                params = {
                    "host": device_ip,
                    "port": cred.get("port", 161),
                    "version": cred.get("version", "2c"),
                    "timeout": cred.get("timeout", 5.0),
                    "retries": cred.get("retries", 3),
                }
                
                if params["version"] == "2c":
                    params["community"] = cred.get("community", "public")
                elif params["version"] == "3":
                    params.update({
                        "username": cred.get("username"),
                        "auth_protocol": cred.get("auth_protocol"),
                        "auth_password": cred.get("auth_password"),
                        "priv_protocol": cred.get("priv_protocol"),
                        "priv_password": cred.get("priv_password"),
                    })
                
                client = create_snmp_client(params)
                
                await _update_job_status(session, job_id, "running", progress=50)
                
                result = await client.set(oid, value, value_type)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "snmp",
                        "operation": "set",
                        "oid": oid,
                        "value": value,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (SNMPTimeoutError, SNMPAuthError, SNMPClientError) as e:
                error_type = "timeout" if isinstance(e, SNMPTimeoutError) else "authentication" if isinstance(e, SNMPAuthError) else "snmp_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.snmp_bulkwalk")
def snmp_bulkwalk(self: RLSTask, job_id: str, device_ip: str, oid: str, cred: Dict[str, Any], max_rows: int = 100) -> str:
    """
    Execute SNMP BULKWALK operation on device.
    
    Args:
        job_id: Job UUID for tracking
        device_ip: Target device IP address
        oid: Starting SNMP OID for walk
        cred: SNMP credentials dictionary
        max_rows: Maximum rows to retrieve
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                params = {
                    "host": device_ip,
                    "port": cred.get("port", 161),
                    "version": cred.get("version", "2c"),
                    "timeout": cred.get("timeout", 5.0),
                    "retries": cred.get("retries", 3),
                    "max_repetitions": cred.get("max_repetitions", 25),
                }
                
                if params["version"] == "2c":
                    params["community"] = cred.get("community", "public")
                elif params["version"] == "3":
                    params.update({
                        "username": cred.get("username"),
                        "auth_protocol": cred.get("auth_protocol"),
                        "auth_password": cred.get("auth_password"),
                        "priv_protocol": cred.get("priv_protocol"),
                        "priv_password": cred.get("priv_password"),
                    })
                
                client = create_snmp_client(params)
                
                await _update_job_status(session, job_id, "running", progress=30)
                
                results = await client.bulk_walk(oid, max_rows=max_rows)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "snmp",
                        "operation": "bulkwalk",
                        "oid": oid,
                        "count": len(results),
                        "results": results,
                    },
                    progress=100,
                )
                
            except (SNMPTimeoutError, SNMPAuthError, SNMPClientError) as e:
                error_type = "timeout" if isinstance(e, SNMPTimeoutError) else "authentication" if isinstance(e, SNMPAuthError) else "snmp_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.webpa_get")
def webpa_get(self: RLSTask, job_id: str, endpoint: Dict[str, Any], path: str) -> str:
    """
    Execute WebPA GET operation.
    
    Args:
        job_id: Job UUID for tracking
        endpoint: WebPA endpoint configuration
        path: Parameter path to query
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                client = create_webpa_client(endpoint["base_url"], endpoint.get("auth", {}))
                
                await _update_job_status(session, job_id, "running", progress=50)
                
                result = await client.get(path)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "webpa",
                        "operation": "get",
                        "path": path,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (WebPATimeoutError, WebPAAuthError, WebPAClientError) as e:
                error_type = "timeout" if isinstance(e, WebPATimeoutError) else "authentication" if isinstance(e, WebPAAuthError) else "webpa_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.webpa_set")
def webpa_set(self: RLSTask, job_id: str, endpoint: Dict[str, Any], path: str, value: Any, data_type: int = 0) -> str:
    """
    Execute WebPA SET operation.
    
    Args:
        job_id: Job UUID for tracking
        endpoint: WebPA endpoint configuration
        path: Parameter path to set
        value: Value to set
        data_type: WebPA data type
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                client = create_webpa_client(endpoint["base_url"], endpoint.get("auth", {}))
                
                await _update_job_status(session, job_id, "running", progress=50)
                
                result = await client.set(path, value, data_type)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "webpa",
                        "operation": "set",
                        "path": path,
                        "value": value,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (WebPATimeoutError, WebPAAuthError, WebPAClientError) as e:
                error_type = "timeout" if isinstance(e, WebPATimeoutError) else "authentication" if isinstance(e, WebPAAuthError) else "webpa_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.tr069_get")
def tr069_get(self: RLSTask, job_id: str, endpoint: Dict[str, Any], device_id: str, parameters: list) -> str:
    """
    Execute TR-069 GetParameterValues operation.
    
    Args:
        job_id: Job UUID for tracking
        endpoint: TR-069 ACS endpoint configuration
        device_id: Device identifier in ACS
        parameters: List of parameter paths to retrieve
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                client = create_tr069_client(endpoint["base_url"], endpoint.get("auth", {}))
                
                await _update_job_status(session, job_id, "running", progress=30)
                
                result = await client.get_parameter_values(device_id, parameters)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "tr069",
                        "operation": "GetParameterValues",
                        "device_id": device_id,
                        "parameters": parameters,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (TR069TimeoutError, TR069AuthError, TR069ClientError) as e:
                error_type = "timeout" if isinstance(e, TR069TimeoutError) else "authentication" if isinstance(e, TR069AuthError) else "tr069_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.tr069_set")
def tr069_set(self: RLSTask, job_id: str, endpoint: Dict[str, Any], device_id: str, parameters: Dict[str, Any]) -> str:
    """
    Execute TR-069 SetParameterValues operation.
    
    Args:
        job_id: Job UUID for tracking
        endpoint: TR-069 ACS endpoint configuration
        device_id: Device identifier in ACS
        parameters: Dictionary of parameter paths to values
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                client = create_tr069_client(endpoint["base_url"], endpoint.get("auth", {}))
                
                await _update_job_status(session, job_id, "running", progress=30)
                
                result = await client.set_parameter_values(device_id, parameters)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "tr069",
                        "operation": "SetParameterValues",
                        "device_id": device_id,
                        "parameters": parameters,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (TR069TimeoutError, TR069AuthError, TR069ClientError) as e:
                error_type = "timeout" if isinstance(e, TR069TimeoutError) else "authentication" if isinstance(e, TR069AuthError) else "tr069_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.usp_get")
def usp_get(self: RLSTask, job_id: str, endpoint: Dict[str, Any], device_id: str, path: str) -> str:
    """
    Execute USP Get operation.
    
    Args:
        job_id: Job UUID for tracking
        endpoint: USP controller endpoint configuration
        device_id: Device endpoint identifier
        path: Data model path to query
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                client = create_usp_client(endpoint["base_url"], endpoint.get("auth", {}))
                
                await _update_job_status(session, job_id, "running", progress=50)
                
                result = await client.get(device_id, path)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "usp",
                        "operation": "get",
                        "device_id": device_id,
                        "path": path,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (USPTimeoutError, USPAuthError, USPClientError) as e:
                error_type = "timeout" if isinstance(e, USPTimeoutError) else "authentication" if isinstance(e, USPAuthError) else "usp_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.usp_set")
def usp_set(self: RLSTask, job_id: str, endpoint: Dict[str, Any], device_id: str, path: str, value: Any) -> str:
    """
    Execute USP Set operation.
    
    Args:
        job_id: Job UUID for tracking
        endpoint: USP controller endpoint configuration
        device_id: Device endpoint identifier
        path: Data model path to set
        value: Value to set
        
    Returns:
        Job ID
    """
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                await _update_job_status(session, job_id, "running", progress=10)
                
                if await _check_cancellation(session, job_id):
                    await _update_job_status(session, job_id, "cancelled", {"message": "Job cancelled by user"})
                    return
                
                client = create_usp_client(endpoint["base_url"], endpoint.get("auth", {}))
                
                await _update_job_status(session, job_id, "running", progress=50)
                
                result = await client.set(device_id, path, value)
                
                await client.close()
                
                await _update_job_status(
                    session, 
                    job_id, 
                    "completed", 
                    {
                        "protocol": "usp",
                        "operation": "set",
                        "device_id": device_id,
                        "path": path,
                        "value": value,
                        "result": result,
                    },
                    progress=100,
                )
                
            except (USPTimeoutError, USPAuthError, USPClientError) as e:
                error_type = "timeout" if isinstance(e, USPTimeoutError) else "authentication" if isinstance(e, USPAuthError) else "usp_error"
                await _update_job_status(session, job_id, "failed", {"error": error_type, "message": str(e)})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": "unexpected", "message": str(e)})
    
    asyncio.run(_run())
    return job_id
