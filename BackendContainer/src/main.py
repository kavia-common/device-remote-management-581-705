import argparse
from typing import Dict

import orjson
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from src.config import get_settings
from src.middleware.tenant_context import TenantContextMiddleware
from src.api.routes import auth as auth_routes
from src.api.routes import tenants as tenants_routes
from src.api.routes import users as users_routes
from src.api.routes import devices as devices_routes
from src.api.routes import jobs as jobs_routes

settings = get_settings()

openapi_tags = [
    {"name": "auth", "description": "Authentication endpoints"},
    {"name": "tenants", "description": "Tenant management"},
    {"name": "users", "description": "User management"},
    {"name": "devices", "description": "Device registry"},
    {"name": "jobs", "description": "Async job enqueue + SSE progress"},
]

app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI backend for Device Remote Management. Multi-tenant, RLS-enforced.",
    version=settings.APP_VERSION,
    openapi_tags=openapi_tags,
)

# CORS
if settings.cors_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )

# Tenant context middleware
app.add_middleware(TenantContextMiddleware)


@app.get("/health", tags=["auth"], summary="Health check")
def health():
    """
    Health check endpoint.

    Returns:
    - {"status":"ok"}
    """
    return {"status": "ok"}


@app.get(
    "/docs/websocket-usage",
    tags=["auth"],
    summary="WebSocket/SSE usage notes",
    description="SSE is available for job events at /jobs/events/{job_id}. WebSocket endpoints may be added later.",
)
def websocket_usage_notes():
    """
    Provides notes on how WebSocket/SSE endpoints will be used in this project.
    """
    return {
        "websocket": "Future endpoints will be documented with operation_id, tags, and usage.",
        "sse": "Available now at /jobs/events/{job_id}",
    }


# Routers
app.include_router(auth_routes.router)
app.include_router(tenants_routes.router)
app.include_router(users_routes.router)
app.include_router(devices_routes.router)
app.include_router(jobs_routes.router)


def generate_openapi_schema() -> Dict:
    schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Device Remote Management API",
        routes=app.routes,
    )
    return schema


# PUBLIC_INTERFACE
def export_openapi(path: str) -> None:
    """Export the API OpenAPI schema to a JSON file."""
    schema = generate_openapi_schema()
    data = orjson.dumps(schema, option=orjson.OPT_INDENT_2)
    with open(path, "wb") as f:
        f.write(data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backend utility")
    parser.add_argument("--export-openapi", type=str, help="Export OpenAPI JSON to path")
    args = parser.parse_args()
    if args.export_openapi:
        export_openapi(args.export_openapi)
        print(f"OpenAPI exported to {args.export_openapi}")
