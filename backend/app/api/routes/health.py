from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.api.dependencies import Session

router = APIRouter()


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "api"


@router.get("/live", response_model=HealthResponse)
async def live() -> HealthResponse:
    return HealthResponse()


class ReadinessResponse(HealthResponse):
    persistence: Literal["ready"] = "ready"


@router.get("/ready", response_model=ReadinessResponse)
async def ready(session: Session) -> ReadinessResponse:
    await session.execute(text("SELECT 1"))
    return ReadinessResponse()
