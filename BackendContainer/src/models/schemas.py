from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field


class APIMessage(BaseModel):
    message: str = Field(..., description="Human-readable message")


# Auth
class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT bearer token")
    token_type: str = Field(default="bearer", description="Token type (always bearer)")
    expires_in: int = Field(..., description="Seconds until expiration")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")


# Tenants
class TenantCreate(BaseModel):
    name: str = Field(..., description="Tenant name")


class Tenant(BaseModel):
    id: str
    name: str
    created_at: datetime


# Users
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = Field(default="user")


class User(BaseModel):
    id: str
    tenant_id: str
    email: EmailStr
    role: str
    created_at: datetime


# Devices
class DeviceCreate(BaseModel):
    name: str
    ip: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Device(BaseModel):
    id: str
    tenant_id: str
    name: str
    ip: str
    metadata: Dict[str, Any]
    created_by: Optional[str] = None
    created_at: datetime
