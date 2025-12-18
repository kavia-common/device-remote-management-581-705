"""
TR-181 parameter catalog API endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import text

from src.db.session import get_db_session
from src.models.tr181_schemas import (
    TR181ImportRequest,
    TR181ImportResponse,
    TR181Parameter,
    TR181ParameterList,
    TR181TreeNode,
    TR181ValidationRequest,
    TR181ValidationResponse,
)
from src.tr181.catalog import create_tr181_catalog

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tr181", tags=["tr181"])


# PUBLIC_INTERFACE
@router.post(
    "/import",
    response_model=TR181ImportResponse,
    summary="Import TR-181 seed data",
    description="Import TR-181 parameters from a seed source (optional, for initial setup).",
)
async def import_tr181_seed(
    body: TR181ImportRequest,
    request: Request,
):
    """
    Import TR-181 seed parameters into the database.
    
    This is typically used for initial setup or loading standard
    TR-181 data models from Broadband Forum specifications.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    # Load seed data from catalog
    catalog = create_tr181_catalog()
    count = catalog.load_seed_data(source=body.source)
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        imported = 0
        
        # Get all seed parameters
        seed_params = catalog.search_parameters()
        
        for param in seed_params:
            path = param['path']
            schema = param['schema']
            
            # Check if exists
            if not body.overwrite:
                check = text("""
                    SELECT id FROM tr181_parameters
                    WHERE path = :path
                      AND (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)
                """)
                result = await session.execute(
                    check,
                    {'path': path, 'tenant_id': tenant_id}
                )
                
                if result.fetchone():
                    continue  # Skip existing
            
            # Insert or update
            upsert = text("""
                INSERT INTO tr181_parameters (id, tenant_id, path, schema, created_at)
                VALUES (gen_random_uuid(), NULL, :path, :schema::jsonb, now())
                ON CONFLICT (path, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
                DO UPDATE SET schema = EXCLUDED.schema
            """)
            
            await session.execute(
                upsert,
                {'path': path, 'schema': schema}
            )
            imported += 1
        
        await session.commit()
        
        logger.info(f"Imported {imported} TR-181 parameters from source: {body.source}")
        
        return TR181ImportResponse(
            message=f"Successfully imported {imported} parameters",
            imported_count=imported
        )


# PUBLIC_INTERFACE
@router.get(
    "/parameters",
    response_model=TR181ParameterList,
    summary="Search TR-181 parameters",
    description="Search TR-181 parameters with filters for path prefix, type, access level, etc.",
)
async def search_tr181_parameters(
    request: Request,
    path_prefix: Optional[str] = Query(None, description="Filter by path prefix (e.g., 'Device.WiFi')"),
    param_type: Optional[str] = Query(None, description="Filter by type (string, boolean, int, etc.)"),
    access: Optional[str] = Query(None, description="Filter by access level (readOnly, readWrite)"),
    search: Optional[str] = Query(None, description="Search in path or description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
):
    """
    Search TR-181 parameters with flexible filters.
    
    Returns both tenant-specific and global (shared) parameters.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        # Build query
        where_clause = "WHERE (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)"
        params = {'tenant_id': tenant_id}
        
        if path_prefix:
            where_clause += " AND path LIKE :path_prefix"
            params['path_prefix'] = f"{path_prefix}%"
        
        if param_type:
            where_clause += " AND schema->>'type' = :param_type"
            params['param_type'] = param_type
        
        if access:
            where_clause += " AND schema->>'access' = :access"
            params['access'] = access
        
        if search:
            where_clause += " AND (path ILIKE :search OR schema->>'description' ILIKE :search)"
            params['search'] = f"%{search}%"
        
        # Count total
        count_query = f"SELECT COUNT(*) FROM tr181_parameters {where_clause}"
        result = await session.execute(text(count_query), params)
        total = result.scalar_one()
        
        # Fetch page
        offset = (page - 1) * page_size
        list_query = text(f"""
            SELECT id, tenant_id, path, schema, created_at
            FROM tr181_parameters
            {where_clause}
            ORDER BY path ASC
            LIMIT :limit OFFSET :offset
        """)
        
        result = await session.execute(
            list_query,
            {**params, 'limit': page_size, 'offset': offset}
        )
        
        parameters = [
            TR181Parameter(
                id=str(row.id),
                tenant_id=str(row.tenant_id) if row.tenant_id else None,
                path=row.path,
                schema=row.schema or {},
                created_at=row.created_at
            )
            for row in result.fetchall()
        ]
        
        return TR181ParameterList(
            items=parameters,
            total=total,
            page=page,
            page_size=page_size
        )


# PUBLIC_INTERFACE
@router.get(
    "/tree",
    response_model=TR181TreeNode,
    summary="Get TR-181 parameter tree",
    description="Build hierarchical tree structure of TR-181 parameters by path segments.",
)
async def get_tr181_tree(
    request: Request,
    root_path: str = Query("Device", description="Root path to build tree from"),
):
    """
    Build a hierarchical tree of TR-181 parameters.
    
    Organizes parameters by path segments for easier navigation.
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        # Fetch all parameters under root path
        query = text("""
            SELECT id, path, schema
            FROM tr181_parameters
            WHERE path LIKE :path_pattern
              AND (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)
            ORDER BY path ASC
        """)
        
        result = await session.execute(
            query,
            {'path_pattern': f"{root_path}%", 'tenant_id': tenant_id}
        )
        
        # Build catalog with fetched parameters
        catalog = create_tr181_catalog()
        for row in result.fetchall():
            catalog._parameters[row.path] = {
                'path': row.path,
                'schema': row.schema or {}
            }
        
        # Build tree
        tree = catalog.build_tree(root_path)
        
        return TR181TreeNode(**tree)


# PUBLIC_INTERFACE
@router.get(
    "/parameters/{param_id}",
    response_model=TR181Parameter,
    summary="Get TR-181 parameter details",
    description="Retrieve details for a specific TR-181 parameter by ID.",
)
async def get_tr181_parameter(
    param_id: str,
    request: Request,
):
    """Get TR-181 parameter by ID."""
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        query = text("""
            SELECT id, tenant_id, path, schema, created_at
            FROM tr181_parameters
            WHERE id = :param_id::uuid
              AND (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)
        """)
        
        result = await session.execute(
            query,
            {'param_id': param_id, 'tenant_id': tenant_id}
        )
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="TR-181 parameter not found")
        
        return TR181Parameter(
            id=str(row.id),
            tenant_id=str(row.tenant_id) if row.tenant_id else None,
            path=row.path,
            schema=row.schema or {},
            created_at=row.created_at
        )


# PUBLIC_INTERFACE
@router.post(
    "/validate",
    response_model=TR181ValidationResponse,
    summary="Validate TR-181 parameter set",
    description="Validate a set of TR-181 parameter paths and values before applying.",
)
async def validate_tr181_parameters(
    body: TR181ValidationRequest,
    request: Request,
):
    """
    Validate proposed TR-181 parameter values.
    
    Checks:
    - Parameter paths exist
    - Values match expected types
    - Parameters are writable (not read-only)
    """
    tenant_id = request.state.tenant_id
    user_id = request.state.user_id
    
    async with get_db_session(tenant_id=tenant_id, user_id=user_id) as session:
        # Load catalog with current parameters
        catalog = create_tr181_catalog()
        
        # Fetch parameters from DB to validate against
        paths = list(body.parameters.keys())
        if paths:
            query = text("""
                SELECT path, schema
                FROM tr181_parameters
                WHERE path = ANY(:paths)
                  AND (tenant_id = :tenant_id::uuid OR tenant_id IS NULL)
            """)
            
            result = await session.execute(
                query,
                {'paths': paths, 'tenant_id': tenant_id}
            )
            
            for row in result.fetchall():
                catalog._parameters[row.path] = {
                    'path': row.path,
                    'schema': row.schema or {}
                }
        
        # Validate
        is_valid, errors = catalog.validate_parameters(body.parameters)
        
        return TR181ValidationResponse(
            valid=is_valid,
            errors=errors
        )
