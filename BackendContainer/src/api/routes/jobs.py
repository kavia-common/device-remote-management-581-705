from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from src.config import get_settings
from src.celery_app import celery_app
from src.db.session import get_db_session

router = APIRouter(prefix="/jobs", tags=["jobs"])
_settings = get_settings()


class EnqueueSNMPGet(BaseModel):
    device_ip: str = Field(..., description="Target device IP")
    oid: str = Field(..., description="OID to GET")
    cred: Dict[str, Any] = Field(default_factory=dict, description="SNMP credential parameters")


class EnqueueWebPAGet(BaseModel):
    endpoint: Dict[str, Any] = Field(..., description="WebPA endpoint object {base_url,auth}")
    path: str = Field(..., description="Parameter path")


class EnqueueTR069Get(BaseModel):
    endpoint: Dict[str, Any] = Field(..., description="TR-069 ACS endpoint {base_url,auth}")
    parameter: str = Field(..., description="Parameter name")


class EnqueueUSPGet(BaseModel):
    endpoint: Dict[str, Any] = Field(..., description="USP controller endpoint {base_url,auth}")
    path: str = Field(..., description="Object path")


async def _insert_job(tenant_id: Optional[str], user_id: Optional[str], kind: str, params: Dict[str, Any]) -> str:
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        res = await session.execute(
            text(
                "INSERT INTO jobs (id, tenant_id, device_id, kind, status, requested_by, params) "
                "VALUES (gen_random_uuid(), current_setting('app.tenant_id')::uuid, NULL, :kind, 'queued', "
                "current_setting('app.user_id')::uuid, :params::jsonb) RETURNING id::text"
            ),
            {"kind": kind, "params": json.dumps(params)},
        )
        row = res.first()
        return row[0] if row else ""


def _enqueue(task_name: str, job_id: str, tenant_id: Optional[str], user_id: Optional[str], kwargs: Dict[str, Any]) -> str:
    # Pass RLS context into Celery task through special kwargs
    celery_app.send_task(task_name, kwargs={**kwargs, "_tenant_id": tenant_id, "_user_id": user_id})
    return job_id


@router.post(
    "/enqueue/snmp/get",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue SNMP GET job",
    description="Creates a job row with RLS context and dispatches a Celery task.",
)
async def enqueue_snmp_get(body: EnqueueSNMPGet, request: Request) -> Dict[str, Any]:
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: missing tenant/user")
    job_id = await _insert_job(tenant_id, user_id, "SNMP_GET", body.model_dump())
    _enqueue("job.snmp_get", job_id, tenant_id, user_id, {"job_id": job_id, "device_ip": body.device_ip, "oid": body.oid, "cred": body.cred})
    return {"job_id": job_id, "status": "queued"}


@router.post(
    "/enqueue/webpa/get",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue WebPA GET job",
    description="Creates a WebPA GET job and dispatches Celery task.",
)
async def enqueue_webpa_get(body: EnqueueWebPAGet, request: Request) -> Dict[str, Any]:
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: missing tenant/user")
    job_id = await _insert_job(tenant_id, user_id, "WEBPA_GET", body.model_dump())
    _enqueue("job.webpa_get", job_id, tenant_id, user_id, {"job_id": job_id, "endpoint": body.endpoint, "path": body.path})
    return {"job_id": job_id, "status": "queued"}


@router.post(
    "/enqueue/tr069/get",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue TR-069 GET job",
    description="Creates a TR-069 GET job and dispatches Celery task.",
)
async def enqueue_tr069_get(body: EnqueueTR069Get, request: Request) -> Dict[str, Any]:
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: missing tenant/user")
    job_id = await _insert_job(tenant_id, user_id, "TR069_GET", body.model_dump())
    _enqueue("job.tr069_get", job_id, tenant_id, user_id, {"job_id": job_id, "endpoint": body.endpoint, "parameter": body.parameter})
    return {"job_id": job_id, "status": "queued"}


@router.post(
    "/enqueue/usp/get",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue USP GET job",
    description="Creates a USP GET job and dispatches Celery task.",
)
async def enqueue_usp_get(body: EnqueueUSPGet, request: Request) -> Dict[str, Any]:
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    if not tenant_id or not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized: missing tenant/user")
    job_id = await _insert_job(tenant_id, user_id, "USP_GET", body.model_dump())
    _enqueue("job.usp_get", job_id, tenant_id, user_id, {"job_id": job_id, "endpoint": body.endpoint, "path": body.path})
    return {"job_id": job_id, "status": "queued"}


async def _sse_event_stream(tenant_id: Optional[str], user_id: Optional[str], job_id: str) -> AsyncGenerator[bytes, None]:
    """
    Simple polling-based SSE stream for job status. In production, use pub/sub.
    """
    if not tenant_id or not user_id:
        yield b"event: error\ndata: {\"error\":\"unauthorized\"}\n\n"
        return

    last_status: Optional[str] = None
    for _ in range(120):  # ~60s if sleep(0.5)
        async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
            res = await session.execute(
                text(
                    "SELECT j.status, coalesce(to_jsonb(r.result), '{}'::jsonb) "
                    "FROM jobs j LEFT JOIN job_results r ON j.id = r.job_id "
                    "WHERE j.id = :job_id::uuid"
                ),
                {"job_id": job_id},
            )
            row = res.first()
            if row:
                status_val, result_val = row[0], row[1]
                payload = {"status": status_val, "result": result_val}
                if status_val != last_status:
                    last_status = status_val
                    yield f"event: update\ndata: {json.dumps(payload)}\n\n".encode("utf-8")
                if status_val in ("completed", "failed"):
                    yield f"event: done\ndata: {json.dumps(payload)}\n\n".encode("utf-8")
                    break
        await asyncio.sleep(0.5)


@router.get(
    "/events/{job_id}",
    summary="SSE: Subscribe to job progress",
    description="Server-Sent Events endpoint. Emits 'update' when status changes and 'done' at completion.",
)
async def job_events(job_id: str, request: Request) -> StreamingResponse:
    if not _settings.ENABLE_SSE:
        raise HTTPException(status_code=404, detail="SSE disabled")
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    return StreamingResponse(_sse_event_stream(tenant_id, user_id, job_id), media_type="text/event-stream")
