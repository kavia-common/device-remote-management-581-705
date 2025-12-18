from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from src.models.schemas import LoginRequest, TokenResponse
from src.security.auth import create_access_token, hash_password, verify_password
from src.db.session import get_db_session

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")
    tenant_name: Optional[str] = Field(default=None, description="Optional tenant to create")


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email/password",
    description="Authenticates a user and returns a JWT containing tenant_id and user id in sub.",
)
async def login(body: LoginRequest, request: Request):
    """
    Authenticate user with email and password.

    Parameters:
    - email: Email address
    - password: Password

    Returns:
    - TokenResponse: bearer token and expiry
    """
    # Placeholder: This should verify credentials from DB with proper RLS scoping.
    # For scaffold purposes, accept any credentials and mint a demo token.
    demo_user_id = "00000000-0000-0000-0000-000000000001"
    demo_tenant_id = "00000000-0000-0000-0000-0000000000aa"

    # Example of how to query with RLS context
    async with get_db_session(tenant_id=demo_tenant_id, user_id=demo_user_id) as _session:
        pass

    if not body.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials")

    token = create_access_token(subject=demo_user_id, tenant_id=demo_tenant_id)
    return TokenResponse(access_token=token, expires_in=3600)


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Register a new tenant and admin user (scaffold)",
    description="Creates a tenant and an admin user; returns a token. Placeholder implementation.",
)
async def register(body: RegisterRequest):
    """
    Registers a new tenant and an admin user.

    Returns:
    - TokenResponse with initial credentials
    """
    # Placeholder: In real implementation, insert tenant and user, hash password
    _ = hash_password(body.password)
    demo_user_id = "00000000-0000-0000-0000-000000000002"
    demo_tenant_id = "00000000-0000-0000-0000-0000000000bb"
    token = create_access_token(subject=demo_user_id, tenant_id=demo_tenant_id)
    return TokenResponse(access_token=token, expires_in=3600)
