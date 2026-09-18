import logging
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import JSONResponse

from app.api.dependencies import workspace_owner
from app.api.routes import resources
from app.api.router import api_router, application_routers
from app.config import get_settings
from app.db import init_database
from app.db.session import SessionFactory
from app.runtime_credentials import RuntimeCredentialsMiddleware


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        await init_database()
        application.state.session_factory = SessionFactory
        yield

    app = FastAPI(
        title=settings.name,
        version=settings.version,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        description="Authoritative backend for persistence, AI and application APIs.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RuntimeCredentialsMiddleware)

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, error: Exception):
        reference = uuid4().hex[:12]
        logging.getLogger(__name__).error(
            "Unhandled API error: reference=%s path=%s category=%s",
            reference, request.url.path, type(error).__name__,
        )
        return JSONResponse(
            {"detail": "服务暂时不可用，请稍后重试。", "requestId": reference},
            status_code=500,
            headers={"Cache-Control": "no-store"},
        )

    app.include_router(api_router, prefix=settings.api_prefix)
    for router in application_routers:
        app.include_router(router, dependencies=[] if router is resources.router else [Depends(workspace_owner)])

    @app.get(f"{settings.api_prefix}/openapi.json", include_in_schema=False)
    async def openapi_schema():
        return JSONResponse(app.openapi())

    @app.get(f"{settings.api_prefix}/docs", include_in_schema=False)
    async def api_docs():
        return get_swagger_ui_html(openapi_url=f"{settings.api_prefix}/openapi.json", title=settings.name)

    @app.get(f"{settings.api_prefix}/redoc", include_in_schema=False)
    async def api_redoc():
        return get_redoc_html(openapi_url=f"{settings.api_prefix}/openapi.json", title=settings.name)

    @app.get("/", tags=["service"])
    async def service_info() -> dict[str, str]:
        return {
            "name": settings.name,
            "version": settings.version,
            "docs": f"{settings.api_prefix}/docs",
        }

    return app


app = create_app()
