from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# MIB Module schemas
class MIBModuleCreate(BaseModel):
    """Request to create/register a parsed MIB module."""
    name: str = Field(..., description="MIB module name")
    file_path: Optional[str] = Field(None, description="Original file path or blob reference")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class MIBModule(BaseModel):
    """MIB module representation."""
    id: str = Field(..., description="Module UUID")
    tenant_id: Optional[str] = Field(None, description="Tenant ID (null for global)")
    name: str = Field(..., description="MIB module name")
    file_path: Optional[str] = Field(None, description="Original file path")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    created_at: datetime = Field(..., description="Creation timestamp")


class MIBModuleList(BaseModel):
    """List of MIB modules with pagination."""
    items: List[MIBModule] = Field(..., description="List of modules")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")


# MIB OID schemas
class MIBOID(BaseModel):
    """MIB OID representation."""
    id: str = Field(..., description="OID record UUID")
    module_id: str = Field(..., description="Parent module UUID")
    oid: str = Field(..., description="OID string (e.g., 1.3.6.1.2.1.1.1)")
    name: str = Field(..., description="OID name/symbol")
    syntax: Optional[str] = Field(None, description="Syntax type (e.g., OCTET STRING, INTEGER)")
    access: Optional[str] = Field(None, description="Access level (read-only, read-write, etc.)")
    description: Optional[str] = Field(None, description="OID description")
    parent_oid: Optional[str] = Field(None, description="Parent OID if part of tree")
    created_at: datetime = Field(..., description="Creation timestamp")


class MIBOIDTree(BaseModel):
    """Tree structure for OID hierarchy."""
    oid: str = Field(..., description="OID string")
    name: str = Field(..., description="OID name")
    syntax: Optional[str] = Field(None, description="Syntax type")
    access: Optional[str] = Field(None, description="Access level")
    description: Optional[str] = Field(None, description="Description")
    children: List['MIBOIDTree'] = Field(default_factory=list, description="Child OIDs")


class MIBOIDList(BaseModel):
    """List of MIB OIDs with pagination."""
    items: List[MIBOID] = Field(..., description="List of OIDs")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")


class MIBUploadResponse(BaseModel):
    """Response after MIB file upload."""
    message: str = Field(..., description="Status message")
    task_id: Optional[str] = Field(None, description="Celery task ID for background parsing")
    module_id: Optional[str] = Field(None, description="Module ID if parsing completed synchronously")


# Update forward references
MIBOIDTree.model_rebuild()
