from typing import Optional, Tuple

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from src.security.auth import decode_token


def _extract_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def _extract_ids_from_claims(claims: dict) -> Tuple[Optional[str], Optional[str]]:
    tenant_id = claims.get("tenant_id")
    user_id = claims.get("sub")
    return tenant_id, user_id


class TenantContextMiddleware(BaseHTTPMiddleware):
    """Middleware that decodes JWT and attaches tenant_id/user_id into request.state."""

    async def dispatch(self, request: Request, call_next):
        token = _extract_bearer_token(request.headers.get("Authorization"))
        tenant_id = None
        user_id = None
        if token:
            ok, claims, _ = decode_token(token)
            if ok and claims:
                tenant_id, user_id = _extract_ids_from_claims(claims)

        # Attach to state for use by route dependencies
        request.state.tenant_id = tenant_id
        request.state.user_id = user_id

        response = await call_next(request)
        return response
