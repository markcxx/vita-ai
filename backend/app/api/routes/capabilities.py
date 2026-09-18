from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class Capability(BaseModel):
    name: str
    status: str
    owner: str


class CapabilitiesResponse(BaseModel):
    architecture_phase: str
    capabilities: list[Capability]


@router.get("", response_model=CapabilitiesResponse)
async def list_capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse(
        architecture_phase="fastapi-authoritative",
        capabilities=[
            Capability(name="resume-tools", status="active", owner="fastapi"),
            Capability(name="interview-orchestration", status="active", owner="fastapi"),
            Capability(name="persistence", status="active", owner="fastapi"),
        ],
    )
