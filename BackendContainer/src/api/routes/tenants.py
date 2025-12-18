from typing import List

from fastapi import APIRouter, Request
from src.models.scripts import *  # noqa
from src.models.schemas import Tenant, TenantCreate
from src.db.session import get_db_session

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get(
    "",
    response_model=List[Tenant],
    summary="List tenants",
    description="List tenants visible to the current user (scaffold).",
)
async def list_tenants(request: Request):
    """
    Returns list of tenants visible to current user.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as _session:
        # Placeholder: Query tenants table with RLS
        pass
    return []


@router.post(
    "",
    response_model=Tenant,
    summary="Create tenant",
    description="Create a new tenant (admin only) - scaffold.",
)
async def create_tenant(body: TenantCreate, request: Request):
    """
    Create a tenant and return it.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as _session:
        pass
    return Tenant(id="demo", name=body.name, created_at="1970-01-01T00:00:00Z")
