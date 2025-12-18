from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

from src.config import get_settings

_settings = get_settings()

_engine: AsyncEngine = create_async_engine(
    str(_settings.DATABASE_URL),
    pool_pre_ping=True,
    echo=False,
)

_session_factory = async_sessionmaker(bind=_engine, class_=AsyncSession, expire_on_commit=False)


# PUBLIC_INTERFACE
def get_engine() -> AsyncEngine:
    """Return the global async SQLAlchemy engine."""
    return _engine


async def _apply_rls_context(session: AsyncSession, tenant_id: Optional[str], user_id: Optional[str]) -> None:
    """Apply Postgres session variables to drive RLS policies via app GUC helpers."""
    # We call helper functions created by DatabaseContainer/migrate.sh
    # They set current_setting('app.tenant_id') and 'app.user_id'
    if tenant_id:
        await session.execute(text("SELECT app.set_current_tenant(:tenant_id::uuid)"), {"tenant_id": tenant_id})
    if user_id:
        await session.execute(text("SELECT app.set_current_user(:user_id::uuid)"), {"user_id": user_id})


# PUBLIC_INTERFACE
@asynccontextmanager
async def get_db_session(tenant_id: Optional[str] = None, user_id: Optional[str] = None) -> AsyncIterator[AsyncSession]:
    """Yield an AsyncSession applying tenant/user RLS context for the lifetime of the session."""
    async with _session_factory() as session:
        # Apply RLS context at session start
        await _apply_rls_context(session, tenant_id, user_id)
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
