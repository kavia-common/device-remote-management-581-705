from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TR181Parameter(BaseModel):
    """TR-181 parameter representation."""
    id: str = Field(..., description="Parameter UUID")
    tenant_id: Optional[str] = Field(None, description="Tenant ID (null for global)")
    path: str = Field(..., description="TR-181 path (e.g., Device.DeviceInfo.Manufacturer)")
    schema: Dict[str, Any] = Field(default_factory=dict, description="Schema/metadata (type, access, etc.)")
    created_at: datetime = Field(..., description="Creation timestamp")


class TR181ParameterList(BaseModel):
    """List of TR-181 parameters with pagination."""
    items: List[TR181Parameter] = Field(..., description="List of parameters")
    total: int = Field(..., description="Total count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")


class TR181TreeNode(BaseModel):
    """Tree structure for TR-181 parameter hierarchy."""
    path: str = Field(..., description="Full path")
    name: str = Field(..., description="Node/segment name")
    schema: Dict[str, Any] = Field(default_factory=dict, description="Schema if leaf")
    children: List['TR181TreeNode'] = Field(default_factory=list, description="Child nodes")
    is_leaf: bool = Field(default=False, description="True if this is a parameter, not just a path segment")


class TR181ImportRequest(BaseModel):
    """Request to import TR-181 seed data."""
    source: str = Field(..., description="Source identifier or URL for TR-181 data")
    overwrite: bool = Field(default=False, description="Overwrite existing parameters")


class TR181ImportResponse(BaseModel):
    """Response after TR-181 import."""
    message: str = Field(..., description="Status message")
    imported_count: int = Field(default=0, description="Number of parameters imported")


class TR181ValidationRequest(BaseModel):
    """Request to validate a proposed TR-181 parameter set."""
    parameters: Dict[str, Any] = Field(..., description="Parameter path -> value mapping")


class TR181ValidationResponse(BaseModel):
    """Response from TR-181 validation."""
    valid: bool = Field(..., description="True if all parameters are valid")
    errors: List[Dict[str, str]] = Field(default_factory=list, description="Validation errors")


# Update forward references
TR181TreeNode.model_rebuild()
