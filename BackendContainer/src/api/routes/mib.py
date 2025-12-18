"""
MIB management API endpoints.
"""
import logging
import os
import tempfile
import uuid
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import text

from src.db.session import get_db_session
from src.models.mib_schemas import (
    MIBOID,
    MIBModule,
    MIBModuleList,
    MIBOIDList,
    MIBOIDTree,
    MIBUploadResponse,
)
from src.tasks.mib_tasks import parse_mib_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mib", tags=["mib"])


# PUBLIC_INTERFACE
@router.post(
    "/upload",
    response_model=MIBUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload and parse MIB file",
    description="Upload a MIB file (.mib, .txt, or .tar.gz) for background parsing. Returns task ID for tracking.",
)
async def upload_mib(
    request: Request,
    file: UploadFile = File(..., description="MIB file to upload"),
    name: Optional[str] = Form(None, description="Optional module name override"),
):
    """
    Upload and parse a MIB file.
    
    Accepts:
    - .mib files
    - .txt files
    - .tar.gz archives containing multiple MIB files
    
    Parsing is performed in background via Celery task for large files.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant context")
    
    # Validate file type
    filename = file.filename or "upload.mib"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ['.mib', '.txt', '.gz'] and not filename.endswith('.tar.gz'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Accepted: .mib, .txt, .tar.gz"
        )
    
    # Save uploaded file to temp location
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        logger.info(f"Saved uploaded file to {tmp_path}")
        
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")
    
    # Determine module name
    module_name = name or os.path.splitext(filename)[0]
    
    # Enqueue background parsing task
    try:
        task = parse_mib_file.apply_async(
            args=[tmp_path, module_name, tenant_id],
            kwargs={'_tenant_id': tenant_id, '_user_id': user_id}
        )
        
        return MIBUploadResponse(
            message="MIB file uploaded and queued for parsing",
            task_id=task.id
        )
        
    except Exception as e:
        logger.error(f"Failed to enqueue MIB parsing task: {e}")
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass
        raise HTTPException(status_code=500, detail="Failed to enqueue parsing task")


# PUBLIC_INTERFACE
@router.get(
    "/modules",
    response_model=MIBModuleList,
    summary="List MIB modules",
    description="List MIB modules with optional search and pagination.",
)
async def list_mib_modules(
    request: Request,
    search: Optional[str] = Query(None, description="Search by module name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List MIB modules accessible to current tenant.
    
    Returns both tenant-specific and global (shared) modules.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        # Build query
        where_clause = "WHERE (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)"
        params = {'tenant_id': tenant_id}
        
        if search:
            where_clause += " AND name ILIKE :search"
            params['search'] = f"%{search}%"
        
        # Count total
        count_query = f"SELECT COUNT(*) FROM mib_modules {where_clause}"
        result = await session.execute(text(count_query), params)
        total = result.scalar_one()
        
        # Fetch page
        offset = (page - 1) * page_size
        list_query = text(f"""
            SELECT id, tenant_id, name, metadata, created_at
            FROM mib_modules
            {where_clause}
            ORDER BY name ASC
            LIMIT :limit OFFSET :offset
        """)
        
        result = await session.execute(
            list_query,
            {**params, 'limit': page_size, 'offset': offset}
        )
        
        modules = [
            MIBModule(
                id=str(row.id),
                tenant_id=str(row.tenant_id) if row.tenant_id else None,
                name=row.name,
                file_path=None,
                metadata=row.metadata or {},
                created_at=row.created_at
            )
            for row in result.fetchall()
        ]
        
        return MIBModuleList(
            items=modules,
            total=total,
            page=page,
            page_size=page_size
        )


# PUBLIC_INTERFACE
@router.get(
    "/modules/{module_id}",
    response_model=MIBModule,
    summary="Get MIB module details",
    description="Retrieve details for a specific MIB module.",
)
async def get_mib_module(
    module_id: str,
    request: Request,
):
    """Get MIB module by ID."""
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        query = text("""
            SELECT id, tenant_id, name, metadata, created_at
            FROM mib_modules
            WHERE id = :module_id::uuid
              AND (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)
        """)
        
        result = await session.execute(
            query,
            {'module_id': module_id, 'tenant_id': tenant_id}
        )
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="MIB module not found")
        
        return MIBModule(
            id=str(row.id),
            tenant_id=str(row.tenant_id) if row.tenant_id else None,
            name=row.name,
            file_path=None,
            metadata=row.metadata or {},
            created_at=row.created_at
        )


# PUBLIC_INTERFACE
@router.get(
    "/modules/{module_id}/oids",
    response_model=MIBOIDList,
    summary="List OIDs for MIB module",
    description="List OIDs belonging to a MIB module with optional prefix search and pagination.",
)
async def list_module_oids(
    module_id: str,
    request: Request,
    oid_prefix: Optional[str] = Query(None, description="Filter by OID prefix (e.g., '1.3.6.1')"),
    name_search: Optional[str] = Query(None, description="Search by OID name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
):
    """
    List OIDs for a specific MIB module.
    
    Supports filtering by OID prefix and name search.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        # Verify module exists and is accessible
        module_check = text("""
            SELECT id FROM mib_modules
            WHERE id = :module_id::uuid
              AND (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)
        """)
        
        result = await session.execute(
            module_check,
            {'module_id': module_id, 'tenant_id': tenant_id}
        )
        
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="MIB module not found")
        
        # Build OID query
        where_clause = "WHERE module_id = :module_id::uuid"
        params = {'module_id': module_id, 'tenant_id': tenant_id}
        
        if oid_prefix:
            where_clause += " AND oid LIKE :oid_prefix"
            params['oid_prefix'] = f"{oid_prefix}%"
        
        if name_search:
            where_clause += " AND name ILIKE :name_search"
            params['name_search'] = f"%{name_search}%"
        
        # Count total
        count_query = f"SELECT COUNT(*) FROM mib_oids {where_clause}"
        result = await session.execute(text(count_query), params)
        total = result.scalar_one()
        
        # Fetch page
        offset = (page - 1) * page_size
        list_query = text(f"""
            SELECT id, module_id, oid, name, syntax, access, description, created_at
            FROM mib_oids
            {where_clause}
            ORDER BY oid ASC
            LIMIT :limit OFFSET :offset
        """)
        
        result = await session.execute(
            list_query,
            {**params, 'limit': page_size, 'offset': offset}
        )
        
        oids = [
            MIBOID(
                id=str(row.id),
                module_id=str(row.module_id),
                oid=row.oid,
                name=row.name,
                syntax=row.syntax,
                access=row.access,
                description=row.description,
                parent_oid=None,  # TODO: extract from OID hierarchy
                created_at=row.created_at
            )
            for row in result.fetchall()
        ]
        
        return MIBOIDList(
            items=oids,
            total=total,
            page=page,
            page_size=page_size
        )


# PUBLIC_INTERFACE
@router.delete(
    "/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete MIB module",
    description="Delete a MIB module and all its OIDs.",
)
async def delete_mib_module(
    module_id: str,
    request: Request,
):
    """
    Delete a MIB module.
    
    Only tenant-owned modules can be deleted (not global/shared modules).
    All associated OIDs are also deleted (cascade).
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant context")
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        # Check module exists and is tenant-owned
        check_query = text("""
            SELECT id FROM mib_modules
            WHERE id = :module_id::uuid
              AND tenant_id = :tenant_id::uuid
        """)
        
        result = await session.execute(
            check_query,
            {'module_id': module_id, 'tenant_id': tenant_id}
        )
        
        if not result.fetchone():
            raise HTTPException(
                status_code=404,
                detail="MIB module not found or not owned by tenant"
            )
        
        # Delete OIDs first
        delete_oids = text("DELETE FROM mib_oids WHERE module_id = :module_id::uuid")
        await session.execute(delete_oids, {'module_id': module_id})
        
        # Delete module
        delete_module = text("DELETE FROM mib_modules WHERE id = :module_id::uuid")
        await session.execute(delete_module, {'module_id': module_id})
        
        await session.commit()
        
        logger.info(f"Deleted MIB module {module_id}")
