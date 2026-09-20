from fastapi import APIRouter

from app.api.routes import (
    ai,
    capabilities,
    files,
    health,
    interviews,
    profile_import,
    resources,
    resume_analysis,
    student_strengths,
    tools,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(capabilities.router, prefix="/capabilities", tags=["capabilities"])
api_router.include_router(tools.router, prefix="/tools", tags=["tools"])

# Browser-facing compatibility paths retain the existing /api/* contract, but
# every implementation now lives inside FastAPI.
application_routers = (
    resources.router,
    ai.router,
    interviews.router,
    files.router,
    profile_import.router,
    resume_analysis.router,
    student_strengths.router,
)
