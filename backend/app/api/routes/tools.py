from fastapi import APIRouter
from pydantic import BaseModel

from app.domain.tools import TOOL_CATALOG, ToolDefinition

router = APIRouter()


class ToolCatalogResponse(BaseModel):
    version: str
    tools: list[ToolDefinition]


@router.get("", response_model=ToolCatalogResponse)
async def list_tools() -> ToolCatalogResponse:
    return ToolCatalogResponse(version="2026-08-25", tools=list(TOOL_CATALOG))
