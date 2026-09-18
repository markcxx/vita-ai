import json
from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Resume, ResumeSection, User

DEFAULT_SECTIONS = [
    (
        "personal_info",
        "个人信息",
        {"fullName": "", "jobTitle": "", "email": "", "phone": "", "location": ""},
    ),
    ("summary", "个人总结", {"text": ""}),
    ("work_experience", "工作经历", {"items": []}),
    ("education", "教育经历", {"items": []}),
    ("skills", "专业技能", {"categories": []}),
    ("projects", "项目经历", {"items": []}),
]


def build_tailored_sections(
    profile: dict[str, Any], plan: dict[str, Any], target_role: str
) -> list[dict[str, Any]]:
    """Rebuild tailored content from trusted profile records referenced by ID."""

    def records(key: str) -> list[dict[str, Any]]:
        value = profile.get(key)
        return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []

    def index(key: str) -> dict[str, dict[str, Any]]:
        return {str(item.get("id")): item for item in records(key) if item.get("id")}

    def rewrites(key: str) -> list[dict[str, Any]]:
        value = plan.get(key)
        return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []

    experiences = index("experiences")
    education = index("education")
    projects = index("projects")
    skills = index("skills")
    certifications = index("certifications")
    languages = index("languages")

    work_items = []
    for rewrite in rewrites("experiences"):
        source = experiences.get(str(rewrite.get("sourceId") or rewrite.get("id") or ""))
        if not source:
            continue
        work_items.append(
            {
                "id": str(uuid4()),
                "company": source.get("company", ""),
                "position": source.get("position", ""),
                "location": source.get("location", ""),
                "startDate": source.get("startDate", ""),
                "endDate": None if source.get("current") else source.get("endDate", ""),
                "current": bool(source.get("current")),
                "description": rewrite.get("description") or source.get("description", ""),
                "highlights": rewrite.get("highlights")
                if isinstance(rewrite.get("highlights"), list) and rewrite["highlights"]
                else source.get("highlights", []),
                "technologies": [],
            }
        )

    education_items = []
    for rewrite in rewrites("education"):
        source = education.get(str(rewrite.get("sourceId") or rewrite.get("id") or ""))
        if not source:
            continue
        description = rewrite.get("description") or source.get("description", "")
        education_items.append(
            {
                "id": str(uuid4()),
                "institution": source.get("institution", ""),
                "degree": source.get("degree", ""),
                "field": source.get("field", ""),
                "startDate": source.get("startDate", ""),
                "endDate": source.get("endDate", ""),
                "gpa": source.get("gpa", ""),
                "highlights": [description] if description else [],
            }
        )

    project_items = []
    for rewrite in rewrites("projects"):
        source = projects.get(str(rewrite.get("sourceId") or rewrite.get("id") or ""))
        if not source:
            continue
        project_items.append(
            {
                "id": str(uuid4()),
                "name": source.get("name", ""),
                "url": source.get("url", ""),
                "startDate": source.get("startDate", ""),
                "endDate": source.get("endDate", ""),
                "description": rewrite.get("description") or source.get("description", ""),
                "technologies": source.get("technologies", []),
                "highlights": rewrite.get("highlights")
                if isinstance(rewrite.get("highlights"), list) and rewrite["highlights"]
                else source.get("highlights", []),
            }
        )

    def selected(source: dict[str, dict[str, Any]], key: str) -> list[dict[str, Any]]:
        ids = plan.get(key)
        if not isinstance(ids, list):
            return []
        return [
            {**source[str(item_id)], "id": str(uuid4())}
            for item_id in ids
            if str(item_id) in source
        ]

    selected_skills = selected(skills, "skillCategoryIds")
    selected_certifications = selected(certifications, "certificationIds")
    selected_languages = selected(languages, "languageIds")
    sections = [
        {
            "type": "personal_info",
            "title": "个人信息",
            "content": {**(profile.get("personalInfo") or {}), "jobTitle": target_role},
        },
        {"type": "summary", "title": "个人简介", "content": {"text": plan.get("summary", "")}},
        {
            "type": "work_experience",
            "title": "工作与实习经历",
            "content": {"items": work_items},
        },
        {"type": "education", "title": "教育背景", "content": {"items": education_items}},
        {"type": "skills", "title": "专业技能", "content": {"categories": selected_skills}},
        {"type": "projects", "title": "项目经历", "content": {"items": project_items}},
    ]
    if selected_certifications:
        sections.append(
            {"type": "certifications", "title": "证书", "content": {"items": selected_certifications}}
        )
    if selected_languages:
        sections.append(
            {"type": "languages", "title": "语言能力", "content": {"items": selected_languages}}
        )
    return sections


def json_value(value: Any, fallback: Any) -> Any:
    for _ in range(2):
        if not isinstance(value, str):
            break
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value if isinstance(value, type(fallback)) else fallback


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def section_dto(section: ResumeSection) -> dict[str, Any]:
    return {
        "id": section.id,
        "resumeId": section.resume_id,
        "type": section.type,
        "title": section.title,
        "sortOrder": section.sort_order,
        "visible": section.visible,
        "content": json_value(section.content, {}),
        "createdAt": iso(section.created_at),
        "updatedAt": iso(section.updated_at),
    }


def resume_dto(resume: Resume, *, public: bool = False) -> dict[str, Any]:
    value = {
        "id": resume.id,
        "userId": resume.user_id,
        "title": resume.title,
        "template": resume.template,
        "themeConfig": json_value(resume.theme_config, {}),
        "isDefault": resume.is_default,
        "language": resume.language,
        "shareToken": resume.share_token,
        "isPublic": resume.is_public,
        "sharePassword": resume.share_password,
        "viewCount": resume.view_count,
        "version": resume.version,
        "createdAt": iso(resume.created_at),
        "updatedAt": iso(resume.updated_at),
        "sections": [section_dto(item) for item in resume.sections],
    }
    if public:
        value.pop("userId", None)
        value.pop("sharePassword", None)
    return value


async def get_resume(session: AsyncSession, resume_id: str) -> Resume | None:
    return await session.scalar(
        select(Resume).options(selectinload(Resume.sections)).where(Resume.id == resume_id)
    )


async def owned_resume(session: AsyncSession, user: User, resume_id: str) -> Resume:
    resume = await get_resume(session, resume_id)
    if not resume or resume.user_id != user.id:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


async def create_resume(
    session: AsyncSession,
    user: User,
    data: dict[str, Any],
) -> Resume:
    resume = Resume(
        user_id=user.id,
        title=str(data.get("title") or "未命名简历")[:200],
        template=str(data.get("template") or "classic")[:100],
        language="en" if data.get("language") == "en" else "zh",
        theme_config=data.get("themeConfig") if isinstance(data.get("themeConfig"), dict) else {},
    )
    session.add(resume)
    await session.flush()
    incoming = data.get("sections")
    sections = (
        incoming
        if isinstance(incoming, list) and incoming
        else [
            {"type": kind, "title": title, "content": content, "visible": True}
            for kind, title, content in DEFAULT_SECTIONS
        ]
    )
    for index, raw in enumerate(sections):
        if not isinstance(raw, dict):
            continue
        session.add(
            ResumeSection(
                resume_id=resume.id,
                type=str(raw.get("type") or "custom")[:80],
                title=str(raw.get("title") or "自定义模块")[:200],
                sort_order=index,
                visible=raw.get("visible") is not False,
                content=raw.get("content") if isinstance(raw.get("content"), dict) else {},
            )
        )
    await session.commit()
    created = await get_resume(session, resume.id)
    assert created is not None
    return created


async def update_resume(
    session: AsyncSession,
    resume: Resume,
    data: dict[str, Any],
) -> Resume:
    await session.refresh(resume, with_for_update=True)
    expected_version = data.get("expectedVersion")
    if expected_version is not None and expected_version != resume.version:
        raise HTTPException(
            status_code=409, detail={"message": "Version conflict", "version": resume.version}
        )
    if "title" in data:
        resume.title = str(data["title"] or "未命名简历")[:200]
    if "template" in data:
        resume.template = str(data["template"] or "classic")[:100]
    if isinstance(data.get("themeConfig"), dict):
        resume.theme_config = data["themeConfig"]
    if data.get("language") in {"zh", "en"}:
        resume.language = data["language"]
    if isinstance(data.get("sections"), list):
        await session.execute(delete(ResumeSection).where(ResumeSection.resume_id == resume.id))
        for index, raw in enumerate(data["sections"]):
            if not isinstance(raw, dict):
                continue
            session.add(
                ResumeSection(
                    id=str(raw.get("id")) if raw.get("id") else None,
                    resume_id=resume.id,
                    type=str(raw.get("type") or "custom")[:80],
                    title=str(raw.get("title") or "自定义模块")[:200],
                    sort_order=index,
                    visible=raw.get("visible") is not False,
                    content=raw.get("content") if isinstance(raw.get("content"), dict) else {},
                )
            )
    resume.version += 1
    await session.commit()
    updated = await get_resume(session, resume.id)
    assert updated is not None
    return updated
