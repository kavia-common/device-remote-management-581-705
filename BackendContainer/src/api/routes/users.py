from typing import List

from fastapi import APIRouter, Request, status, HTTPException
from src.models.schemas import User, UserCreate
from src.db.session import get_db_session

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=List[User],
    summary="List users",
    description="List users in current tenant (scaffold).",
)
async def list_users(request: Request):
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as _session:
        pass
    return []


@router.post(
    "",
    response_model=User,
    status_code=status.HTTP_201_CREATED,
    summary="Create user",
    description="Create a user in current tenant (scaffold).",
)
async def create_user(body: UserCreate, request: Request):
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as _session:
        pass
    if not body.email:
        raise HTTPException(status_code=400, detail="Email required")
    return User(
        id="demo-user",
        tenant_id=tenant_id or "demo-tenant",
        email=body.email,
        role=body.role,
        created_at="1970-01-01T00:00:00Z",
    )
