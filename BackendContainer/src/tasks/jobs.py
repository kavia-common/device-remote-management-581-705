from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.celery_app import RLSTask, celery_app
from src.db.session import get_db_session


# Stub protocol clients — replace with real implementations later
class SNMPClient:
    def __init__(self, ip: str, params: Dict[str, Any]):
        self.ip = ip
        self.params = params

    async def get(self, oid: str) -> Dict[str, Any]:
        await asyncio.sleep(0.5)
        return {"oid": oid, "value": f"stub-value-from-{self.ip}"}


class WebPAClient:
    def __init__(self, base_url: str, auth: Dict[str, Any]):
        self.base_url = base_url
        self.auth = auth

    async def get(self, path: str) -> Dict[str, Any]:
        await asyncio.sleep(0.5)
        return {"path": path, "value": "stub-webpa"}


class TR069Client:
    def __init__(self, base_url: str, auth: Dict[str, Any]):
        self.base_url = base_url
        self.auth = auth

    async def get(self, parameter: str) -> Dict[str, Any]:
        await asyncio.sleep(0.5)
        return {"parameter": parameter, "value": "stub-tr069"}


class USPClient:
    def __init__(self, base_url: str, auth: Dict[str, Any]):
        self.base_url = base_url
        self.auth = auth

    async def get(self, path: str) -> Dict[str, Any]:
        await asyncio.sleep(0.5)
        return {"path": path, "value": "stub-usp"}


async def _update_job_status(
    session: AsyncSession, job_id: str, status: str, details: Optional[Dict[str, Any]] = None
) -> None:
    await session.execute(
        text("UPDATE jobs SET status=:status, updated_at=now() WHERE id=:job_id::uuid"),
        {"status": status, "job_id": job_id},
    )
    if details is not None:
        await session.execute(
            text(
                "INSERT INTO job_results(id, tenant_id, job_id, result) "
                "VALUES (gen_random_uuid(), current_setting('app.tenant_id')::uuid, :job_id::uuid, :result::jsonb) "
                "ON CONFLICT (job_id) DO UPDATE SET result = EXCLUDED.result"
            ),
            {"job_id": job_id, "result": details},
        )


@celery_app.task(bind=True, base=RLSTask, name="job.snmp_get")
def snmp_get(self: RLSTask, job_id: str, device_ip: str, oid: str, cred: Dict[str, Any]) -> str:
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            await _update_job_status(session, job_id, "running")
            try:
                client = SNMPClient(device_ip, cred)
                result = await client.get(oid)
                await _update_job_status(session, job_id, "completed", {"result": result})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": str(e)})
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.webpa_get")
def webpa_get(self: RLSTask, job_id: str, endpoint: Dict[str, Any], path: str) -> str:
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            await _update_job_status(session, job_id, "running")
            try:
                client = WebPAClient(endpoint["base_url"], endpoint.get("auth", {}))
                result = await client.get(path)
                await _update_job_status(session, job_id, "completed", {"result": result})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": str(e)})
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.tr069_get")
def tr069_get(self: RLSTask, job_id: str, endpoint: Dict[str, Any], parameter: str) -> str:
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            await _update_job_status(session, job_id, "running")
            try:
                client = TR069Client(endpoint["base_url"], endpoint.get("auth", {}))
                result = await client.get(parameter)
                await _update_job_status(session, job_id, "completed", {"result": result})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": str(e)})
    asyncio.run(_run())
    return job_id


@celery_app.task(bind=True, base=RLSTask, name="job.usp_get")
def usp_get(self: RLSTask, job_id: str, endpoint: Dict[str, Any], path: str) -> str:
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            await _update_job_status(session, job_id, "running")
            try:
                client = USPClient(endpoint["base_url"], endpoint.get("auth", {}))
                result = await client.get(path)
                await _update_job_status(session, job_id, "completed", {"result": result})
            except Exception as e:
                await _update_job_status(session, job_id, "failed", {"error": str(e)})
    asyncio.run(_run())
    return job_id
