import asyncio
import logging
from datetime import UTC, datetime
from uuid import NAMESPACE_URL, UUID, uuid5
from weakref import WeakValueDictionary

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.dependencies import Session, WorkspaceOwner
from app.db.models import CandidateProfile, ResumeAnalysisReport
from app.db.session import SessionFactory
from app.services.student_strengths import analyze_student_profile

router = APIRouter(prefix="/api/student-strengths", tags=["student-strengths"])
logger = logging.getLogger(__name__)
_locks: WeakValueDictionary[str, asyncio.Lock] = WeakValueDictionary()


class GenerateRequest(BaseModel):
    requestId: UUID


def report_id(owner: str, request: UUID):
    return str(uuid5(NAMESPACE_URL, f"student-strengths:{owner}:{request}"))


@router.get("/{request_id}")
async def get_report(request_id: UUID, session: Session, user: WorkspaceOwner, response: Response):
    response.headers["Cache-Control"] = "private, no-store"
    row = await session.scalar(select(ResumeAnalysisReport).where(
        ResumeAnalysisReport.id == report_id(user.id, request_id), ResumeAnalysisReport.user_id == user.id))
    if row is None:
        raise HTTPException(404, "报告尚未生成")
    return row.result


@router.post("")
async def generate(body: GenerateRequest, session: Session, user: WorkspaceOwner):
    owner = user.id
    identifier = report_id(owner, body.requestId)
    lock = _locks.setdefault(identifier, asyncio.Lock())
    await session.rollback()
    async with lock:
        async with SessionFactory() as reader:
            existing = await reader.scalar(select(ResumeAnalysisReport).where(
                ResumeAnalysisReport.id == identifier, ResumeAnalysisReport.user_id == owner))
            if existing:
                return existing.result
            profile = await reader.scalar(select(CandidateProfile).where(CandidateProfile.user_id == owner))
            if profile is None or not any(profile.data.get(key) for key in ("summary", "education", "experiences", "projects", "skills", "certifications")):
                raise HTTPException(422, "个人资料库还没有可分析的内容，请先补充教育、技能或实践经历。")
            snapshot, version = profile.data, profile.version
        try:
            analysis = await analyze_student_profile(snapshot)
        except Exception as error:
            logger.error("Student strengths generation failed: %s", type(error).__name__)
            raise HTTPException(502, "个人优势分析暂未完成，请重试。") from error
        result = {"id": identifier, "kind": "student-strengths", "title": "学生个人优势特点分析", "createdAt": datetime.now(UTC).isoformat(), "profileVersion": version,
                  "isSample": bool(snapshot.get("isSample")), **analysis}
        async with SessionFactory() as writer:
            # A second worker may have completed the same idempotent request.
            existing = await writer.scalar(select(ResumeAnalysisReport).where(
                ResumeAnalysisReport.id == identifier, ResumeAnalysisReport.user_id == owner))
            if existing:
                return existing.result
            writer.add(ResumeAnalysisReport(id=identifier, user_id=owner, result=result, source_text=""))
            try:
                await writer.commit()
            except IntegrityError:
                await writer.rollback()
                existing = await writer.scalar(select(ResumeAnalysisReport).where(
                    ResumeAnalysisReport.id == identifier, ResumeAnalysisReport.user_id == owner))
                if existing:
                    return existing.result
                raise
        return result
