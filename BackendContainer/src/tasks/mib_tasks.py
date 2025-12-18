"""
Celery tasks for MIB processing.
Handles background parsing of large MIB files.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from sqlalchemy import text

from src.celery_app import RLSTask, celery_app
from src.db.session import get_db_session
from src.mib.parser import create_mib_parser, MIBParseError

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, base=RLSTask, name="mib.parse_file")
def parse_mib_file(self: RLSTask, file_path: str, module_name: str, tenant_id: str) -> str:
    """
    Background task to parse MIB file and store results in database.
    
    Args:
        file_path: Path to uploaded MIB file
        module_name: Name for the MIB module
        tenant_id: Tenant ID for RLS context
        
    Returns:
        Module ID (UUID) of created module
    """
    
    async def _run():
        async with get_db_session(tenant_id=self.tenant_id, user_id=self.user_id) as session:
            try:
                logger.info(f"Parsing MIB file: {file_path}")
                
                # Parse MIB file
                parser = create_mib_parser()
                parse_results = parser.parse_file(file_path)
                
                module_id = None
                
                for result in parse_results:
                    mod_name = result.get('module_name', module_name)
                    metadata = result.get('metadata', {})
                    oids = result.get('oids', [])
                    
                    # Insert MIB module
                    insert_module = text(
                        """
                        INSERT INTO mib_modules (id, tenant_id, name, metadata, created_at)
                        VALUES (gen_random_uuid(), :tenant_id::uuid, :name, :metadata::jsonb, now())
                        RETURNING id
                        """
                    )
                    
                    result_row = await session.execute(
                        insert_module,
                        {
                            'tenant_id': tenant_id,
                            'name': mod_name,
                            'metadata': metadata
                        }
                    )
                    module_id = str(result_row.scalar_one())
                    
                    logger.info(f"Created MIB module {mod_name} with ID {module_id}")
                    
                    # Insert OIDs
                    for oid_data in oids:
                        insert_oid = text(
                            """
                            INSERT INTO mib_oids (id, tenant_id, module_id, oid, name, syntax, access, description, created_at)
                            VALUES (gen_random_uuid(), :tenant_id::uuid, :module_id::uuid, :oid, :name, :syntax, :access, :description, now())
                            """
                        )
                        
                        await session.execute(
                            insert_oid,
                            {
                                'tenant_id': tenant_id,
                                'module_id': module_id,
                                'oid': oid_data['oid'],
                                'name': oid_data['name'],
                                'syntax': oid_data.get('syntax'),
                                'access': oid_data.get('access'),
                                'description': oid_data.get('description')
                            }
                        )
                    
                    logger.info(f"Inserted {len(oids)} OIDs for module {mod_name}")
                
                await session.commit()
                return module_id
                
            except MIBParseError as e:
                logger.error(f"MIB parsing failed: {e}")
                raise
            except Exception as e:
                logger.error(f"Failed to process MIB file: {e}")
                raise
    
    return asyncio.run(_run())
