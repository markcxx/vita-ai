import hashlib
import re
import secrets
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import Session, WorkspaceOwner
from app.db.models import CandidateProfile, Resume, ResumeShare, User
from app.services.resumes import (
    create_resume,
    get_resume,
    json_value,
    owned_resume,
    resume_dto,
    update_resume,
)

router = APIRouter(prefix="/api", tags=["application"])


def user_dto(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatarUrl": user.avatar_url,
        "createdAt": user.created_at.isoformat(),
        "updatedAt": user.updated_at.isoformat(),
    }


def hash_password(value: str) -> str:
    # Tokens are high entropy; password hashing is isolated here for an Argon2 upgrade.
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@router.get("/user")
async def get_user(user: WorkspaceOwner) -> dict[str, Any]:
    return user_dto(user)


@router.put("/user")
async def update_user(
    session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict[str, Any]:
    if "name" in body:
        user.name = str(body["name"])[:200]
    if "avatarUrl" in body:
        user.avatar_url = str(body["avatarUrl"])[:5000]
    await session.commit()
    return user_dto(user)


@router.get("/user/settings")
async def get_user_settings(user: WorkspaceOwner) -> dict[str, Any]:
    return json_value(user.settings, {})


@router.put("/user/settings")
async def update_user_settings(
    session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict[str, Any]:
    allowed: dict[str, Any] = {}
    # Lock the settings row so simultaneous preference edits cannot overwrite
    # each other with an old JSON snapshot.
    await session.refresh(user, with_for_update=True)
    if isinstance(body.get("autoSave"), bool):
        allowed["autoSave"] = body["autoSave"]
    if isinstance(body.get("autoSaveInterval"), (int, float)):
        allowed["autoSaveInterval"] = max(250, min(int(body["autoSaveInterval"]), 60_000))
    if isinstance(body.get("uiPreferences"), dict):
        preferences = dict((user.settings or {}).get("uiPreferences", {}))
        for key, value in body["uiPreferences"].items():
            if (key in {"vitaai-brand", "vitaai:sidebar-width", "jade_dashboard_view",
                        "vitaai_resume_approval_mode", "theme"}
                    or re.fullmatch(r"jade_tour_[a-zA-Z0-9_-]{1,80}_completed", key)):
                if isinstance(value, str) and len(value) <= 100:
                    preferences[key] = value
        allowed["uiPreferences"] = preferences
    user.settings = {**json_value(user.settings, {}), **allowed}
    await session.commit()
    return user.settings


@router.get("/resume")
async def list_resumes(session: Session, user: WorkspaceOwner) -> list[dict[str, Any]]:
    rows = (
        await session.scalars(
            select(Resume)
            .options(selectinload(Resume.sections))
            .where(Resume.user_id == user.id)
            .order_by(Resume.updated_at.desc())
        )
    ).all()
    return [resume_dto(item) for item in rows]


@router.post("/resume", status_code=201)
async def post_resume(
    session: Session, user: WorkspaceOwner, body: dict = Body(default={})
) -> dict[str, Any]:
    return resume_dto(await create_resume(session, user, body))


@router.get("/resume/{resume_id}")
async def read_resume(resume_id: str, session: Session, user: WorkspaceOwner) -> dict[str, Any]:
    return resume_dto(await owned_resume(session, user, resume_id))


@router.put("/resume/{resume_id}")
async def put_resume(
    resume_id: str, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict[str, Any]:
    resume = await owned_resume(session, user, resume_id)
    return resume_dto(await update_resume(session, resume, body))


@router.delete("/resume/{resume_id}")
async def remove_resume(resume_id: str, session: Session, user: WorkspaceOwner) -> dict[str, bool]:
    resume = await owned_resume(session, user, resume_id)
    await session.delete(resume)
    await session.commit()
    return {"success": True}


@router.post("/resume/{resume_id}/duplicate", status_code=201)
async def duplicate_resume(resume_id: str, session: Session, user: WorkspaceOwner) -> dict[str, Any]:
    source = await owned_resume(session, user, resume_id)
    data = resume_dto(source)
    data["title"] = f"{source.title} (副本)"
    return resume_dto(await create_resume(session, user, data))


async def profile_for(session: Session, user: User) -> CandidateProfile:
    profile = await session.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    if profile:
        return profile
    profile = CandidateProfile(user_id=user.id, data=normalize_profile_data({}))
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile


def normalize_profile_data(data: dict[str, Any]) -> dict[str, Any]:
    """Supply the editor's empty fields while preserving existing profile data."""
    personal = data.get("personalInfo", data.get("basics")) or {}
    preferences = data.get("preferences") or {}
    return {
        **data,
        "isSample": data.get("isSample", False),
        "personalInfo": {
            **dict.fromkeys(
                ("fullName", "jobTitle", "email", "phone", "wechat", "location",
                 "website", "github", "linkedin"), ""
            ),
            **personal,
        },
        "summary": data.get("summary") or "",
        **{field: data.get(field) or [] for field in (
            "education", "projects", "skills", "certifications", "languages"
        )},
        "experiences": data.get("experiences", data.get("experience")) or [],
        "preferences": {
            "targetRoles": [], "targetIndustries": [], "preferredLocations": [],
            **preferences,
        },
    }


def profile_dto(profile: CandidateProfile) -> dict[str, Any]:
    return {
        "id": profile.id,
        "userId": profile.user_id,
        "data": normalize_profile_data(json_value(profile.data, {})),
        "version": profile.version,
        "createdAt": profile.created_at.isoformat(),
        "updatedAt": profile.updated_at.isoformat(),
    }


@router.get("/profile")
async def get_profile(session: Session, user: WorkspaceOwner) -> dict[str, Any]:
    return profile_dto(await profile_for(session, user))


@router.post("/profile")
@router.put("/profile")
async def save_profile(
    session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict[str, Any]:
    profile = await profile_for(session, user)
    data = body.get("data", body)
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail="Profile data must be an object")
    if "expectedVersion" in body:
        # Serialize concurrent imports and refuse to overwrite a newer profile.
        profile = await session.scalar(select(CandidateProfile).where(
            CandidateProfile.user_id == user.id,
        ).with_for_update().execution_options(populate_existing=True))
        if profile.version != body["expectedVersion"]:
            raise HTTPException(409, "资料已在其他页面更新，请关闭导入并刷新页面后重试")
    profile.data = normalize_profile_data(data)
    profile.version += 1
    await session.commit()
    return profile_dto(profile)


@router.get("/resume/{resume_id}/shares")
async def list_shares(
    resume_id: str, request: Request, session: Session, user: WorkspaceOwner
) -> list[dict]:
    await owned_resume(session, user, resume_id)
    shares = (
        await session.scalars(
            select(ResumeShare)
            .where(ResumeShare.resume_id == resume_id)
            .order_by(ResumeShare.created_at.desc())
        )
    ).all()
    return [
        {
            "id": item.id,
            "resumeId": item.resume_id,
            "token": item.token,
            "label": item.label,
            "viewCount": item.view_count,
            "isActive": item.is_active,
            "hasPassword": bool(item.password),
            "shareUrl": f"{str(request.base_url).rstrip('/')}/share/{item.token}",
            "createdAt": item.created_at.isoformat(),
            "updatedAt": item.updated_at.isoformat(),
        }
        for item in shares
    ]


@router.post("/resume/{resume_id}/shares", status_code=201)
async def create_share(
    resume_id: str,
    request: Request,
    session: Session,
    user: WorkspaceOwner,
    body: dict = Body(default={}),
) -> dict:
    await owned_resume(session, user, resume_id)
    token = secrets.token_hex(16)
    password = body.get("password")
    share = ResumeShare(
        resume_id=resume_id,
        token=token,
        label=str(body.get("label") or "")[:200],
        password=hash_password(str(password)) if password else None,
    )
    session.add(share)
    await session.commit()
    await session.refresh(share)
    return {
        "id": share.id,
        "resumeId": resume_id,
        "token": token,
        "label": share.label,
        "viewCount": 0,
        "isActive": True,
        "hasPassword": bool(password),
        "shareUrl": f"{str(request.base_url).rstrip('/')}/share/{token}",
    }


@router.patch("/resume/{resume_id}/shares/{share_id}")
async def patch_share(
    resume_id: str, share_id: str, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict:
    await owned_resume(session, user, resume_id)
    share = await session.get(ResumeShare, share_id)
    if not share or share.resume_id != resume_id:
        raise HTTPException(status_code=404, detail="Share not found")
    if "label" in body:
        share.label = str(body["label"])[:200]
    if "isActive" in body and isinstance(body["isActive"], bool):
        share.is_active = body["isActive"]
    if "password" in body:
        share.password = hash_password(str(body["password"])) if body["password"] else None
    await session.commit()
    return {
        "id": share.id,
        "label": share.label,
        "isActive": share.is_active,
        "hasPassword": bool(share.password),
    }


@router.delete("/resume/{resume_id}/shares/{share_id}")
async def delete_share(
    resume_id: str, share_id: str, session: Session, user: WorkspaceOwner
) -> dict[str, bool]:
    await owned_resume(session, user, resume_id)
    share = await session.get(ResumeShare, share_id)
    if not share or share.resume_id != resume_id:
        raise HTTPException(status_code=404, detail="Share not found")
    await session.delete(share)
    await session.commit()
    return {"success": True}


@router.get("/share/{token}")
async def public_share(token: str, session: Session, password: str | None = None) -> dict[str, Any]:
    share = await session.scalar(select(ResumeShare).where(ResumeShare.token == token))
    if share:
        if not share.is_active:
            raise HTTPException(status_code=404, detail="Share not found")
        expected_password = share.password
        resume = await get_resume(session, share.resume_id)
    else:
        resume = await session.scalar(
            select(Resume).options(selectinload(Resume.sections)).where(Resume.share_token == token)
        )
        if not resume or not resume.is_public:
            raise HTTPException(status_code=404, detail="Share not found")
        expected_password = resume.share_password
    if expected_password and (not password or hash_password(password) != expected_password):
        raise HTTPException(
            status_code=401, detail={"error": "Password required", "passwordRequired": True}
        )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if share:
        share.view_count += 1
    else:
        resume.view_count += 1
    await session.commit()
    return resume_dto(resume, public=True)
