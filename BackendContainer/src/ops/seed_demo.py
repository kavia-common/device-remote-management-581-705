#!/usr/bin/env python3
"""
seed_demo.py - Ensure demo seed data exists and enqueue a demo SNMP GET job.

This script:
1. Verifies demo tenant, user, device, and credential exist
2. Enqueues a demo SNMP GET job for OID 1.3.6.1.2.1.1.1.0 (sysDescr)
3. Prints job ID for tracking

Usage:
    python -m src.ops.seed_demo
"""

import asyncio
import sys
from typing import Optional

from sqlalchemy import text

from src.config import get_settings
from src.db.session import get_db_session
from src.tasks.jobs import snmp_get


async def get_demo_context() -> Optional[dict]:
    """
    Retrieve demo tenant, user, device, and credential IDs.
    
    Returns:
        Dictionary with tenant_id, user_id, device_id, device_ip, credential_name
        or None if demo data is not found.
    """
    # Use a session without RLS context to find the demo tenant first
    async with get_db_session() as session:
        # Find demo tenant
        result = await session.execute(
            text("SELECT id FROM tenants WHERE name='DemoTenant' LIMIT 1")
        )
        tenant_row = result.fetchone()
        if not tenant_row:
            print("ERROR: DemoTenant not found. Please run seed_demo.sh first.")
            return None
        tenant_id = str(tenant_row[0])
    
    # Now use session with RLS context for tenant-scoped queries
    async with get_db_session(tenant_id=tenant_id) as session:
        # Find demo user
        result = await session.execute(
            text("SELECT id FROM users WHERE email='demoadmin@example.com' LIMIT 1")
        )
        user_row = result.fetchone()
        if not user_row:
            print("ERROR: demoadmin@example.com user not found. Please run seed_demo.sh first.")
            return None
        user_id = str(user_row[0])
        
        # Set user context
        await session.execute(
            text("SELECT app.set_current_user(:user_id::uuid)"),
            {"user_id": user_id}
        )
        
        # Find demo device
        result = await session.execute(
            text("SELECT id, ip FROM devices WHERE name='localhost-snmp' LIMIT 1")
        )
        device_row = result.fetchone()
        if not device_row:
            print("ERROR: localhost-snmp device not found. Please run seed_demo.sh first.")
            return None
        device_id = str(device_row[0])
        device_ip = str(device_row[1])
        
        # Find demo credential
        result = await session.execute(
            text("SELECT name, params FROM snmp_credentials WHERE name='demo-public-v2c' LIMIT 1")
        )
        cred_row = result.fetchone()
        if not cred_row:
            print("ERROR: demo-public-v2c credential not found. Please run seed_demo.sh first.")
            return None
        credential_name = cred_row[0]
        credential_params = cred_row[1]
        
        return {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "device_id": device_id,
            "device_ip": device_ip,
            "credential_name": credential_name,
            "credential_params": credential_params,
        }


async def create_demo_job(context: dict) -> str:
    """
    Create a demo SNMP GET job in the database.
    
    Args:
        context: Demo context with tenant_id, user_id, device_id
        
    Returns:
        Job ID (UUID string)
    """
    async with get_db_session(tenant_id=context["tenant_id"], user_id=context["user_id"]) as session:
        result = await session.execute(
            text(
                "INSERT INTO jobs (id, tenant_id, device_id, kind, status, requested_by, params) "
                "VALUES (gen_random_uuid(), :tenant_id::uuid, :device_id::uuid, :kind, :status, :user_id::uuid, :params::jsonb) "
                "RETURNING id"
            ),
            {
                "tenant_id": context["tenant_id"],
                "device_id": context["device_id"],
                "kind": "SNMP_GET",
                "status": "queued",
                "user_id": context["user_id"],
                "params": '{"oid": "1.3.6.1.2.1.1.1.0", "description": "Demo SNMP GET for sysDescr"}',
            },
        )
        job_row = result.fetchone()
        job_id = str(job_row[0])
        await session.commit()
        return job_id


def enqueue_demo_job(context: dict, job_id: str) -> None:
    """
    Enqueue the demo SNMP GET job via Celery.
    
    Args:
        context: Demo context with device_ip, credential_params, tenant_id, user_id
        job_id: Job ID to track
    """
    # Build credential dict from params
    cred = dict(context["credential_params"])
    cred["version"] = "2c"  # Ensure version is set
    
    # Enqueue task with RLS context
    snmp_get.apply_async(
        args=(job_id, context["device_ip"], "1.3.6.1.2.1.1.1.0", cred),
        kwargs={
            "_tenant_id": context["tenant_id"],
            "_user_id": context["user_id"],
        },
    )


async def main():
    """Main entry point."""
    print("=== Demo Seed & Job Enqueue ===")
    
    # Get demo context
    context = await get_demo_context()
    if not context:
        sys.exit(1)
    
    print(f"✓ Found demo tenant: {context['tenant_id']}")
    print(f"✓ Found demo user: {context['user_id']}")
    print(f"✓ Found demo device: {context['device_id']} ({context['device_ip']})")
    print(f"✓ Found demo credential: {context['credential_name']}")
    
    # Create job
    job_id = await create_demo_job(context)
    print(f"✓ Created job: {job_id}")
    
    # Enqueue job
    enqueue_demo_job(context, job_id)
    print(f"✓ Enqueued SNMP GET job for OID 1.3.6.1.2.1.1.1.0")
    
    backend_url = "http://localhost:8080"
    
    print("\n=== Next Steps ===")
    print(f"1. Check job status: GET {backend_url}/jobs/{job_id}")
    print(f"2. Watch progress via SSE: GET {backend_url}/jobs/events/{job_id}")
    print(f"3. View all jobs: GET {backend_url}/jobs")
    print("\nNote: Ensure Celery worker is running to process the job.")
    print("      Run: celery -A src.celery_app.celery_app worker -l info -Q celery")


if __name__ == "__main__":
    asyncio.run(main())
