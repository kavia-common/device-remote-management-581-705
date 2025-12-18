from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from celery import Celery, Task
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.session import get_db_session
from sqlalchemy import text

_settings = get_settings()


def _make_celery() -> Celery:
    # Celery broker/result via Redis
    app = Celery(
        "drm_backend",
        broker=_settings.CELERY_BROKER_URL,
        backend=_settings.CELERY_RESULT_BACKEND,
        include=["src.tasks.jobs"],
    )
    # Basic, safe defaults
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        worker_hijack_root_logger=False,
        task_always_eager=False,
    )
    return app


celery_app = _make_celery()


class RLSTask(Task):
    """
    Celery Task base that attaches tenant_id/user_id context for DB writes.

    Use: @celery_app.task(base=RLSTask)
    """

    tenant_id: Optional[str] = None
    user_id: Optional[str] = None

    def __call__(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        # Extract RLS context passed with apply_async
        self.tenant_id = kwargs.pop("_tenant_id", None)
        self.user_id = kwargs.pop("_user_id", None)
        return self.run(*args, **kwargs)

    async def set_job_status(
        self, session: AsyncSession, job_id: str, status: str, details: Optional[Dict[str, Any]] = None
    ) -> None:
        await session.execute(
            text(
                "UPDATE jobs SET status=:status, updated_at=:ts WHERE id=:job_id::uuid"
            ),
            {"status": status, "job_id": job_id, "ts": datetime.now(timezone.utc)},
        )
        if details is not None:
            await session.execute(
                text(
                    "INSERT INTO job_results(id, tenant_id, job_id, result) "
                    "VALUES (gen_random_uuid(), current_setting('app.tenant_id')::uuid, :job_id::uuid, :result::jsonb) "
                    "ON CONFLICT (job_id) DO UPDATE SET result = EXCLUDED.result"
                ),
                {"job_id": job_id, "result": json.dumps(details)},
            )

    async def with_rls_session(self) -> AsyncSession:
        # Ensure we always set RLS context
        return get_db_session(tenant_id=self.tenant_id, user_id=self.user_id).__aenter__()  # type: ignore


# Convenience helper to run ad-hoc SQL with RLS context
async def rls_session(tenant_id: Optional[str], user_id: Optional[str]) -> AsyncSession:
    return get_db_session(tenant_id=tenant_id, user_id=user_id).__aenter__()  # type: ignore
