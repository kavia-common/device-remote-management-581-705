#!/usr/bin/env python3
"""
run_demo_snmp.py - Enqueue a demo SNMP GET job against the seeded device.

This minimal script:
1. Finds the demo tenant, user, device, and SNMP credential
2. Enqueues an SNMP GET job for OID 1.3.6.1.2.1.1.1.0 (sysDescr)
3. Prints the job ID and instructions for monitoring

Usage:
    python -m src.ops.run_demo_snmp
"""

import asyncio
import sys

from src.ops.seed_demo import get_demo_context, create_demo_job, enqueue_demo_job


async def main():
    """Main entry point."""
    print("=== Run Demo SNMP GET Job ===")
    
    # Get demo context
    context = await get_demo_context()
    if not context:
        print("\nERROR: Demo data not found.")
        print("Please run: cd DatabaseContainer && ./seed_demo.sh")
        sys.exit(1)
    
    print(f"✓ Targeting device: {context['device_ip']} (localhost-snmp)")
    print(f"✓ Using credential: {context['credential_name']} (v2c, community=public)")
    
    # Create and enqueue job
    job_id = await create_demo_job(context)
    enqueue_demo_job(context, job_id)
    
    print(f"\n✓ Job enqueued: {job_id}")
    print(f"  OID: 1.3.6.1.2.1.1.1.0 (sysDescr)")
    
    backend_url = "http://localhost:8080"
    
    print("\n=== Monitor Job Progress ===")
    print(f"1. REST API: GET {backend_url}/jobs/{job_id}")
    print(f"   - Returns job status and result")
    print(f"\n2. Server-Sent Events (SSE): GET {backend_url}/jobs/events/{job_id}")
    print(f"   - Real-time progress updates")
    print(f"   - Example: curl -N {backend_url}/jobs/events/{job_id}")
    print(f"\n3. List all jobs: GET {backend_url}/jobs")
    
    print("\n=== Requirements ===")
    print("- Celery worker must be running:")
    print("  celery -A src.celery_app.celery_app worker -l info -Q celery")
    print("- SNMP agent must be running on localhost:161 (or demo will fail)")
    print("- For testing without SNMP agent, job will fail but flow is demonstrated")


if __name__ == "__main__":
    asyncio.run(main())
