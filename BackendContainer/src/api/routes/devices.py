from typing import List

from fastapi import APIRouter, Request, status
from src.models.schemas import Device, DeviceCreate
from src.db.session import get_db_session

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get(
    "",
    response_model=List[Device],
    summary="List devices",
    description="List devices scoped to current tenant (scaffold).",
)
async def list_devices(request: Request):
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as _session:
        pass
    return []


@router.post(
    "",
    response_model=Device,
    status_code=status.HTTP_201_CREATED,
    summary="Create device",
    description="Register a new device (scaffold).",
)
async def create_device(body: DeviceCreate, request: Request):
    tenant_id = request.state.tenant_id or "demo-tenant"
    user_id = request.state.user_id
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as _session:
        pass
    return Device(
        id="demo-device",
        tenant_id=tenant_id,
        name=body.name,
        ip=body.ip,
        metadata=body.metadata or {},
        created_by=user_id,
        created_at="1970-01-01T00:00:00Z",
    )
