import json
import time
from collections.abc import AsyncIterator
from copy import deepcopy
from typing import Any

import httpx
from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.utils.json import parse_partial_json
from sqlalchemy import select

from app.ai.prompts import (
    GRAMMAR_CHECK_PROMPT,
    JD_ANALYSIS_PROMPT,
    PROFILE_OPTIMIZE_PROMPT,
    build_cover_letter_prompt,
    build_generate_resume_prompt,
    build_optimization_system_prompt,
    build_resume_system_prompt,
    build_tailored_resume_prompt,
)
from app.ai.provider import AIClient, AIConfigurationError
from app.ai.thinking import thinking_capability
from app.ai.workflows import (
    run_completion,
    run_structured_completion,
    stream_completion,
    stream_resume_chat,
)
from app.api.dependencies import Session, WorkspaceOwner
from app.runtime_credentials import get_runtime_settings
from app.db.models import Analysis, CandidateProfile, ChatMessage, ChatSession, Resume
from app.services.resumes import (
    build_tailored_sections,
    create_resume,
    owned_resume,
    resume_dto,
    update_resume,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def ai_client() -> AIClient:
    try:
        return AIClient()
    except AIConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def resume_context(resume: Resume) -> str:
    return json.dumps(resume_dto(resume), ensure_ascii=False)


def last_text(messages: list[dict[str, Any]]) -> str:
    if not messages:
        return ""
    message = messages[-1]
    if isinstance(message.get("content"), str):
        return message["content"]
    return "".join(
        str(part.get("text", ""))
        for part in message.get("parts", [])
        if isinstance(part, dict) and part.get("type") == "text"
    )


def workflow_event(messages: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Parse the latest private UI workflow event; ordinary user text is never treated as one."""
    if not messages or messages[-1].get("role") != "user":
        return None
    text = last_text(messages).strip()
    markers = (
        ("[[VITAAI_PROPOSAL_EVENT]]", "[[/VITAAI_PROPOSAL_EVENT]]"),
        ("[[VITAAI_WORKFLOW_EVENT]]", "[[/VITAAI_WORKFLOW_EVENT]]"),
    )
    for start, end in markers:
        if not (text.startswith(start) and text.endswith(end)):
            continue
        try:
            value = json.loads(text[len(start) : -len(end)])
        except (json.JSONDecodeError, TypeError):
            return None
        return value if isinstance(value, dict) and isinstance(value.get("type"), str) else None
    return None


@router.get("/config")
async def config() -> dict[str, Any]:
    settings = get_runtime_settings()
    return {"model": settings.ai_model, "provider": settings.ai_provider, "thinking": thinking_capability(settings)}


@router.get("/models")
async def models() -> dict[str, list[dict[str, str]]]:
    settings = get_runtime_settings()
    if not settings.ai_api_key:
        return {"models": []}
    try:
        if settings.ai_provider == "anthropic":
            url = f"{settings.ai_base_url.rstrip('/')}/v1/models"
            headers = {"x-api-key": settings.ai_api_key, "anthropic-version": "2023-06-01"}
        elif settings.ai_provider == "gemini":
            url = f"{settings.ai_base_url.rstrip('/')}/models?key={settings.ai_api_key}"
            headers = {}
        else:
            url = f"{settings.ai_base_url.rstrip('/')}/models"
            headers = {"Authorization": f"Bearer {settings.ai_api_key}"}
        async with httpx.AsyncClient(timeout=20, trust_env=False) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()
        values = payload.get("data", payload.get("models", []))
        return {
            "models": [
                {"id": str(item.get("id") or item.get("name", "")).removeprefix("models/")}
                for item in values
            ]
        }
    except (httpx.HTTPError, KeyError, TypeError):
        return {"models": []}


@router.get("/chat/sessions")
async def list_chat_sessions(resumeId: str, session: Session, user: WorkspaceOwner) -> dict:
    await owned_resume(session, user, resumeId)
    rows = (
        await session.scalars(
            select(ChatSession)
            .where(ChatSession.resume_id == resumeId)
            .order_by(ChatSession.updated_at.desc())
        )
    ).all()
    return {
        "sessions": [
            {
                "id": item.id,
                "resumeId": item.resume_id,
                "title": item.title,
                "createdAt": item.created_at.isoformat(),
                "updatedAt": item.updated_at.isoformat(),
            }
            for item in rows
        ]
    }


@router.post("/chat/sessions", status_code=201)
async def create_chat_session(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    resume_id = str(body.get("resumeId") or "")
    await owned_resume(session, user, resume_id)
    item = ChatSession(resume_id=resume_id)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return {
        "session": {"id": item.id, "resumeId": item.resume_id, "title": item.title, "messages": []}
    }


async def owned_chat(session: Session, user: WorkspaceOwner, session_id: str) -> ChatSession:
    item = await session.get(ChatSession, session_id)
    if not item:
        raise HTTPException(status_code=404, detail="Chat session not found")
    await owned_resume(session, user, item.resume_id)
    return item


@router.get("/chat/sessions/{session_id}")
async def get_chat_session(
    session_id: str, session: Session, user: WorkspaceOwner, cursor: str | None = None, limit: int = 20
) -> dict:
    item = await owned_chat(session, user, session_id)
    query = select(ChatMessage).where(ChatMessage.session_id == session_id)
    if cursor:
        from datetime import datetime

        try:
            query = query.where(ChatMessage.created_at < datetime.fromisoformat(cursor))
        except ValueError:
            pass
    rows = list(
        (
            await session.scalars(
                query.order_by(ChatMessage.created_at.desc()).limit(min(limit, 50) + 1)
            )
        ).all()
    )
    has_more = len(rows) > min(limit, 50)
    rows = rows[: min(limit, 50)]
    rows.reverse()
    messages = [
        {
            "id": message.id,
            "sessionId": message.session_id,
            "role": message.role,
            "content": message.content,
            "metadata": message.message_metadata,
            "createdAt": message.created_at.isoformat(),
        }
        for message in rows
    ]
    return {
        "session": {"id": item.id, "resumeId": item.resume_id, "title": item.title},
        "messages": messages,
        "hasMore": has_more,
        "nextCursor": rows[0].created_at.isoformat() if has_more and rows else None,
    }


@router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str, session: Session, user: WorkspaceOwner
) -> dict[str, bool]:
    item = await owned_chat(session, user, session_id)
    await session.delete(item)
    await session.commit()
    return {"success": True}



@router.post("/chat")
async def chat(
    request: Request, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> StreamingResponse:
    thinking_enabled = body.get("thinkingEnabled", False)
    if thinking_enabled is not None and not isinstance(thinking_enabled, bool):
        raise HTTPException(status_code=422, detail="thinkingEnabled 必须是布尔值")
    messages = body.get("messages") if isinstance(body.get("messages"), list) else []
    resume_id = str(body.get("resumeId") or "")
    chat_session_id = body.get("sessionId")
    context = ""
    resume_value: dict[str, Any] | None = None
    if resume_id:
        resume = await owned_resume(session, user, resume_id)
        resume_value = resume_dto(resume)
        context = json.dumps(resume_value, ensure_ascii=False)
    if chat_session_id:
        chat_session = await owned_chat(session, user, str(chat_session_id))
        content = last_text(messages)
        if content and messages and messages[-1].get("role") == "user":
            session.add(ChatMessage(session_id=chat_session.id, role="user", content=content))
            if chat_session.title == "新对话":
                chat_session.title = content[:50]
            await session.commit()
    profile = await session.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    prompt = build_resume_system_prompt(
        context,
        assistant_name=get_runtime_settings().app_name,
        profile_context=json.dumps(profile.data, ensure_ascii=False) if profile else "",
        can_edit_resume=bool(resume_id),
        can_generate_resume=not bool(resume_id),
        approval_mode="unrestricted"
        if body.get("approvalMode") == "unrestricted"
        else "always ask",
    )
    current_workflow_event = workflow_event(messages)

    async def event_stream() -> AsyncIterator[str]:
        text_id = "text-1"
        reasoning_id = "reasoning-1"
        yield f"data: {json.dumps({'type': 'start'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'start-step'}, ensure_ascii=False)}\n\n"
        final_text = ""
        final_reasoning = ""
        text_started = False
        reasoning_started = False
        tool_parts: list[dict[str, Any]] = []
        try:
            client = ai_client()
            client.thinking_enabled = thinking_enabled
            async for mode, event in stream_resume_chat(
                client,
                system=prompt,
                messages=messages[-20:],
                resume=resume_value,
                profile=profile.data if profile and isinstance(profile.data, dict) else {},
                profile_version=profile.version if profile else 0,
                workflow_event=current_workflow_event,
            ):
                if mode == "values":
                    final_text = str(event.get("final_text", final_text))
                    final_reasoning = str(event.get("final_reasoning", final_reasoning))
                    tool_parts = list(event.get("tool_parts", tool_parts))
                    continue
                if event["type"] == "reasoning":
                    if not reasoning_started:
                        reasoning_started = True
                        yield f"data: {json.dumps({'type': 'reasoning-start', 'id': reasoning_id}, ensure_ascii=False)}\n\n"
                    delta = str(event["delta"])
                    yield f"data: {json.dumps({'type': 'reasoning-delta', 'id': reasoning_id, 'delta': delta}, ensure_ascii=False)}\n\n"
                elif event["type"] == "text":
                    if not text_started:
                        text_started = True
                        yield f"data: {json.dumps({'type': 'text-start', 'id': text_id}, ensure_ascii=False)}\n\n"
                    delta = str(event["delta"])
                    yield f"data: {json.dumps({'type': 'text-delta', 'id': text_id, 'delta': delta}, ensure_ascii=False)}\n\n"
                elif event["type"] == "tool-result":
                    call = event["call"]
                    output = event["output"]
                    payloads = (
                        {
                            "type": "tool-input-start",
                            "toolCallId": call["id"],
                            "toolName": call["name"],
                        },
                        {
                            "type": "tool-input-available",
                            "toolCallId": call["id"],
                            "toolName": call["name"],
                            "input": call["arguments"],
                        },
                        {
                            "type": "tool-output-available",
                            "toolCallId": call["id"],
                            "output": output,
                        },
                    )
                    for payload in payloads:
                        yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

            if reasoning_started:
                yield f"data: {json.dumps({'type': 'reasoning-end', 'id': reasoning_id}, ensure_ascii=False)}\n\n"
            if text_started:
                yield f"data: {json.dumps({'type': 'text-end', 'id': text_id}, ensure_ascii=False)}\n\n"
            if chat_session_id and (final_text or final_reasoning or tool_parts):
                async with request.app.state.session_factory() as save_session:
                    ordered_parts = []
                    if final_reasoning:
                        ordered_parts.append({"type": "reasoning", "text": final_reasoning})
                    if final_text:
                        ordered_parts.append({"type": "text", "text": final_text})
                    ordered_parts.extend({"type": "tool", **part} for part in tool_parts)
                    save_session.add(
                        ChatMessage(
                            session_id=str(chat_session_id),
                            role="assistant",
                            content=final_text,
                            message_metadata={"orderedParts": ordered_parts},
                        )
                    )
                    await save_session.commit()
        except Exception as error:  # streaming must report protocol errors in-band
            yield f"data: {json.dumps({'type': 'error', 'errorText': '服务调用失败，请检查 API Key、模型及服务地址后重试。'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'finish-step'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'finish'}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "x-vercel-ai-ui-message-stream": "v1",
            "cache-control": "no-cache",
            "x-accel-buffering": "no",
        },
    )


@router.post("/jd-analysis")
async def jd_analysis(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    resume = await owned_resume(session, user, str(body.get("resumeId") or ""))
    job_description = str(body.get("jobDescription") or "").strip()
    if not job_description:
        raise HTTPException(status_code=422, detail="jobDescription is required")
    result = await run_structured_completion(
        ai_client(),
        system=JD_ANALYSIS_PROMPT,
        prompt=f"简历：\n{resume_context(resume)}\n\n职位描述：\n{job_description}",
    )
    item = Analysis(
        resume_id=resume.id,
        kind="jd",
        source_text=job_description,
        result=result,
        score=int(result.get("overallScore", 0)),
        secondary_score=int(result.get("atsScore", 0)),
    )
    session.add(item)
    await session.commit()
    return {**result, "historyId": item.id}


@router.post("/grammar-check")
async def grammar_check(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    resume = await owned_resume(session, user, str(body.get("resumeId") or ""))
    section_ids = set(body.get("sectionIds") or [])
    sections = [item for item in resume.sections if not section_ids or item.id in section_ids]
    result = await run_structured_completion(
        ai_client(),
        system=GRAMMAR_CHECK_PROMPT,
        prompt=json.dumps(
            [
                {"id": item.id, "title": item.title, "content": item.content}
                for item in sections
            ],
            ensure_ascii=False,
        ),
    )
    item = Analysis(
        resume_id=resume.id,
        kind="grammar",
        result=result,
        score=int(result.get("score", 0)),
        secondary_score=len(result.get("issues", [])),
    )
    session.add(item)
    await session.commit()
    return {**result, "historyId": item.id}


async def analysis_history(
    kind: str, resume_id: str, session: Session, user: WorkspaceOwner
) -> list[dict]:
    await owned_resume(session, user, resume_id)
    rows = (
        await session.scalars(
            select(Analysis)
            .where(Analysis.resume_id == resume_id, Analysis.kind == kind)
            .order_by(Analysis.created_at.desc())
            .limit(20)
        )
    ).all()
    return [
        {
            "id": item.id,
            "resumeId": item.resume_id,
            "result": item.result,
            "overallScore" if kind == "jd" else "score": item.score,
            "atsScore" if kind == "jd" else "issueCount": item.secondary_score,
            "jobDescription": item.source_text,
            "createdAt": item.created_at.isoformat(),
        }
        for item in rows
    ]


@router.get("/jd-analysis/history")
async def jd_history(resumeId: str, session: Session, user: WorkspaceOwner) -> list[dict]:
    return await analysis_history("jd", resumeId, session, user)


@router.delete("/jd-analysis/history")
async def delete_jd_history(id: str, session: Session, user: WorkspaceOwner) -> dict[str, bool]:
    item = await session.get(Analysis, id)
    if not item or item.kind != "jd":
        raise HTTPException(status_code=404, detail="Analysis not found")
    await owned_resume(session, user, item.resume_id)
    await session.delete(item)
    await session.commit()
    return {"success": True}


@router.get("/grammar-check/history")
async def grammar_history(resumeId: str, session: Session, user: WorkspaceOwner) -> list[dict]:
    return await analysis_history("grammar", resumeId, session, user)


@router.delete("/grammar-check/history")
async def delete_grammar_history(id: str, session: Session, user: WorkspaceOwner) -> dict[str, bool]:
    item = await session.get(Analysis, id)
    if not item or item.kind != "grammar":
        raise HTTPException(status_code=404, detail="Check not found")
    await owned_resume(session, user, item.resume_id)
    await session.delete(item)
    await session.commit()
    return {"success": True}


@router.post("/cover-letter")
async def cover_letter(
    session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict[str, str]:
    resume = await owned_resume(session, user, str(body.get("resumeId") or ""))
    language = str(body.get("language") or "zh")
    tone = str(body.get("tone") or "formal")
    text = await run_completion(
        ai_client(),
        system=build_cover_letter_prompt(tone, language),
        prompt=f"简历：{resume_context(resume)}\n\n职位描述：{body.get('jobDescription', '')}",
    )
    marker = "---CONTENT---"
    if marker in text:
        title, content = text.split(marker, 1)
        return {"title": title.removeprefix("TITLE:").strip(), "content": content.strip()}
    lines = text.splitlines()
    return {
        "title": lines[0].removeprefix("TITLE:").strip(),
        "content": "\n".join(lines[1:]).strip() or text,
    }


@router.post("/generate-resume")
async def generate_resume(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    job_title = str(body.get("jobTitle") or "").strip()
    if not job_title:
        raise HTTPException(status_code=422, detail="jobTitle is required")
    language = "en" if body.get("language") == "en" else "zh"
    result = await run_structured_completion(
        ai_client(),
        system=build_generate_resume_prompt(str(body.get("template") or "classic")),
        prompt=(
            f"为 {job_title} 生成结构化简历，语言 {language}，经验年限 {body.get('yearsOfExperience', 0)}。"
            f"技能：{body.get('skills', [])}；行业：{body.get('industry', '')}；真实经历：{body.get('experience', '')}。"
            "顶层必须是 personal_info、summary、work_experience、education、skills、projects。"
        ),
        max_tokens=16384,
    )
    titles = {
        "personal_info": "个人信息",
        "summary": "个人简介",
        "work_experience": "工作经历",
        "education": "教育背景",
        "skills": "专业技能",
        "projects": "项目经历",
    }
    sections = [
        {"type": key, "title": titles[key], "content": result.get(key, {})} for key in titles
    ]
    resume = await create_resume(
        session,
        user,
        {
            "title": f"{job_title} - AI生成简历",
            "template": body.get("template", "classic"),
            "language": language,
            "sections": sections,
        },
    )
    return {
        "resumeId": resume.id,
        "title": resume.title,
        "sections": resume_dto(resume)["sections"],
    }


@router.post("/profile/optimize")
async def optimize_profile(session: Session, user: WorkspaceOwner) -> dict:
    profile = await session.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    result = await run_structured_completion(
        ai_client(),
        system=PROFILE_OPTIMIZE_PROMPT,
        prompt=json.dumps(profile.data, ensure_ascii=False),
    )
    return {"original": profile.data, "optimized": result}


@router.post("/tailored-resume")
async def tailored_resume(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    profile = await session.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    target_role = str(body.get("targetRole") or "").strip()
    if not target_role:
        raise HTTPException(status_code=422, detail="targetRole is required")
    plan = await run_structured_completion(
        ai_client(),
        system=build_tailored_resume_prompt(str(body.get("template") or "classic"), str(body.get("language") or "zh")),
        prompt=(
            f"目标岗位：{target_role}\nJD：{body.get('jobDescription', '')}\n"
            f"档案：{json.dumps(profile.data, ensure_ascii=False)}"
        ),
    )
    sections = build_tailored_sections(profile.data, plan, target_role)
    title = str(body.get("title") or f"{target_role} - 专项简历")
    resume = await create_resume(
        session,
        user,
        {
            "title": title,
            "template": body.get("template") or "classic",
            "language": body.get("language") or "zh",
            "sections": sections,
        },
    )
    return {
        "resumeId": resume.id,
        "title": resume.title,
        "resume": resume_dto(resume),
        "plan": plan,
        "profileVersion": profile.version,
    }


@router.post("/tailored-resume/stream")
async def stream_tailored_resume(request: Request, session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> StreamingResponse:
    profile = await session.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    if not profile:
        raise HTTPException(404, "请先完善个人资料库")
    target_role = str(body.get("targetRole") or "").strip()
    if not target_role:
        raise HTTPException(422, "请提供目标岗位")
    template = str(body.get("template") or "classic")
    language = "en" if body.get("language") == "en" else "zh"
    title = str(body.get("title") or f"{target_role} - 专项简历")
    client = ai_client()
    if isinstance(body.get("thinkingEnabled"), bool):
        client.thinking_enabled = body["thinkingEnabled"]

    def event(value: dict) -> str:
        return json.dumps(value, ensure_ascii=False) + "\n"

    preview_profile = deepcopy(profile.data)
    # Reveal generated prose as it arrives, rather than flashing the full source
    # paragraph before its rewritten version is streamed.
    for key in ("experiences", "education", "projects"):
        for item in preview_profile.get(key, []):
            if isinstance(item, dict):
                item["description"] = ""
                item["highlights"] = []

    def snapshot(plan: dict) -> dict:
        sections = build_tailored_sections(preview_profile, plan, target_role)
        for i, section in enumerate(sections):
            section.update(id=f"draft-{i}", sortOrder=i, visible=True)
            content = section.get("content", {})
            for key in ("items", "categories"):
                for j, item in enumerate(content.get(key, [])):
                    item["id"] = f"draft-{i}-{j}"
        return {"type": "preview", "sections": sections}

    async def events() -> AsyncIterator[str]:
        text = ""
        last_sent = 0.0
        last_snapshot = ""
        thinking_sent = False
        try:
            yield event({"type": "status", "message": "正在整理个人资料"})
            yield event(snapshot({}))
            async for delta in stream_completion(
                client,
                system=build_tailored_resume_prompt(template, language),
                messages=[{"role": "user", "content": f"目标岗位：{target_role}\nJD：{body.get('jobDescription', '')}\n档案：{json.dumps(profile.data, ensure_ascii=False)}"}],
            ):
                if await request.is_disconnected():
                    return
                if delta["type"] == "reasoning":
                    if not thinking_sent:
                        thinking_sent = True
                        yield event({"type": "status", "message": "正在分析岗位与经历"})
                    continue
                if delta["type"] != "text":
                    continue
                text += str(delta["delta"])
                if time.monotonic() - last_sent < .15:
                    continue
                last_sent = time.monotonic()
                try:
                    partial = parse_partial_json(text)
                    if isinstance(partial, dict):
                        value = event(snapshot(partial))
                        if value != last_snapshot:
                            last_snapshot = value
                            yield value
                except (ValueError, TypeError, AttributeError):
                    pass  # An incomplete token is not yet renderable.
            from app.ai.provider import extract_json

            plan = extract_json(text)
            if not isinstance(plan.get("summary"), str) or any(
                not isinstance(plan.get(key), list)
                for key in ("experiences", "education", "projects", "skillCategoryIds", "certificationIds", "languageIds")
            ):
                raise ValueError("Incomplete resume plan")
            yield event(snapshot(plan))
            if await request.is_disconnected():
                return
            yield event({"type": "status", "message": "内容已生成，正在保存"})
            resume = await create_resume(session, user, {
                "title": title, "template": template, "language": language,
                "sections": build_tailored_sections(profile.data, plan, target_role),
            })
            yield event({"type": "complete", "resumeId": resume.id, "title": resume.title, "resume": resume_dto(resume)})
        except Exception:
            await session.rollback()
            yield event({"type": "error", "message": "生成未完成，请稍后重试；当前预览不是已保存的简历。"})

    return StreamingResponse(events(), media_type="application/x-ndjson", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/translate")
async def translate_resume(
    session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> StreamingResponse:
    source = await owned_resume(session, user, str(body.get("resumeId") or ""))
    target = str(body.get("targetLanguage") or "en")
    destination = source
    if body.get("mode") == "copy":
        destination = await create_resume(
            session,
            user,
            {
                **resume_dto(source),
                "title": f"{source.title} ({target})",
                "language": target,
            },
        )
    selected = set(body.get("sectionIds") or [])
    translated = await run_structured_completion(
        ai_client(),
        system=f'把简历翻译为 {target}。保留 JSON 结构、ID、URL、邮箱、数字，只输出 {{"sections": [...]}}。',
        prompt=json.dumps(
            {
                "sections": [
                    {"sectionId": item.id, "title": item.title, "content": item.content}
                    for item in source.sections
                    if not selected or item.id in selected
                ]
            },
            ensure_ascii=False,
        ),
        max_tokens=16384,
    )
    translated_sections = [
        item for item in translated.get("sections", []) if isinstance(item, dict)
    ]
    by_id = {str(item.get("sectionId")): item for item in translated_sections}
    data = resume_dto(destination)
    applied: list[dict[str, Any]] = []
    for index, section in enumerate(data["sections"]):
        replacement = by_id.get(section["id"])
        if body.get("mode") == "copy" and replacement is None and index < len(translated_sections):
            replacement = translated_sections[index]
        if replacement:
            section["title"] = replacement.get("title", section["title"])
            section["content"] = replacement.get("content", section["content"])
            applied.append(
                {
                    "sectionId": section["id"],
                    "title": section["title"],
                    "content": section["content"],
                }
            )
    data["language"] = target
    updated = await update_resume(session, destination, data)
    result = resume_dto(updated)

    async def events() -> AsyncIterator[str]:
        total = len(applied)
        for index, section in enumerate(applied, 1):
            yield (
                json.dumps(
                    {
                        "type": "progress",
                        "completed": index,
                        "total": total,
                        "section": section,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
        yield (
            json.dumps(
                {
                    "type": "done",
                    "failedCount": 0,
                    "newResumeId": updated.id if body.get("mode") == "copy" else None,
                    "language": target,
                    "sections": result["sections"],
                },
                ensure_ascii=False,
            )
            + "\n"
        )

    return StreamingResponse(events(), media_type="application/x-ndjson")


@router.post("/resume-edit/optimize")
async def optimize_resume(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    resume = await owned_resume(session, user, str(body.get("resumeId") or ""))
    result = await run_structured_completion(
        ai_client(),
        system=build_optimization_system_prompt(resume_context(resume)),
        prompt=f"范围：{body.get('scope')}\n要求：{body.get('instruction', '')}",
    )
    proposal = result.get("proposal", result)
    proposal["requiresApproval"] = True
    proposal["expectedVersion"] = resume.version
    return {"proposal": proposal}


@router.post("/resume-edit/apply")
async def apply_resume_edit(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    resume = await owned_resume(session, user, str(body.get("resumeId") or ""))
    proposal = body.get("proposal") if isinstance(body.get("proposal"), dict) else body
    operation = proposal.get("operation")
    data = resume_dto(resume)
    sections = data["sections"]
    target = next((item for item in sections if item["id"] == proposal.get("sectionId")), None)

    if operation == "optimize_resume":
        by_id = {item["id"]: item for item in sections}
        for change in proposal.get("changes", []):
            if not isinstance(change, dict) or change.get("newValue") is None:
                continue
            section = by_id.get(change.get("sectionId"))
            field = change.get("field")
            if (
                not section
                or not isinstance(field, str)
                or field in {"__proto__", "prototype", "constructor"}
            ):
                continue
            content = section["content"]
            edit_target = content
            if change.get("itemId"):
                collection = "categories" if section["type"] == "skills" else "items"
                edit_target = next(
                    (
                        value
                        for value in content.get(collection, [])
                        if isinstance(value, dict) and value.get("id") == change["itemId"]
                    ),
                    None,
                )
                if edit_target is None:
                    continue
            edit_target[field] = change["newValue"]
    elif operation == "add_section":
        value = proposal.get("newSection")
        if not isinstance(value, dict) or not value.get("type") or not value.get("title"):
            raise HTTPException(status_code=400, detail="Invalid section proposal")
        sections.append(
            {
                "type": value["type"],
                "title": value["title"],
                "visible": True,
                "content": value.get("content") or {},
            }
        )
    elif operation == "remove_resume_item":
        if not target or not proposal.get("itemId"):
            raise HTTPException(status_code=404, detail="Resume item not found")
        collection = "categories" if target["type"] == "skills" else "items"
        target["content"][collection] = [
            value
            for value in target["content"].get(collection, [])
            if not isinstance(value, dict) or value.get("id") != proposal["itemId"]
        ]
    elif operation == "remove_section":
        if not target or target["type"] == "personal_info":
            raise HTTPException(status_code=400, detail="Section cannot be removed")
        data["sections"] = [item for item in sections if item["id"] != target["id"]]
    elif operation == "rename_section":
        if not target or not str(proposal.get("newValue") or "").strip():
            raise HTTPException(status_code=400, detail="Invalid section title")
        target["title"] = str(proposal["newValue"]).strip()
    elif operation == "reorder_sections":
        order = proposal.get("sectionIds")
        if not isinstance(order, list) or set(order) != {item["id"] for item in sections}:
            raise HTTPException(status_code=400, detail="Invalid section order")
        indexed = {item["id"]: item for item in sections}
        data["sections"] = [indexed[value] for value in order]
    elif operation == "set_section_visibility":
        if not target or not isinstance(proposal.get("newValue"), bool):
            raise HTTPException(status_code=400, detail="Invalid visibility proposal")
        target["visible"] = proposal["newValue"]
    elif operation in {"rename_resume", "update_title"}:
        if not str(proposal.get("newValue") or "").strip():
            raise HTTPException(status_code=400, detail="Invalid resume title")
        data["title"] = str(proposal["newValue"]).strip()
    elif operation in {"switch_template", "update_template"}:
        data["template"] = str(
            proposal.get("template") or proposal.get("newValue") or data["template"]
        )
    elif operation in {"apply_theme_preset", "update_theme_settings"}:
        theme = proposal.get("themeConfig") or proposal.get("newValue")
        if not isinstance(theme, dict):
            raise HTTPException(status_code=400, detail="Invalid theme proposal")
        data["themeConfig"] = theme
    elif operation == "translate_resume":
        for change in proposal.get("changes", []):
            if not isinstance(change, dict):
                continue
            section = next(
                (item for item in sections if item["id"] == change.get("sectionId")), None
            )
            if section:
                section["title"] = change.get("newTitle") or section["title"]
                replacement = change.get("updatedContent", change.get("newValue"))
                if isinstance(replacement, dict):
                    section["content"] = replacement
        if proposal.get("targetLanguage") in {"zh", "en"}:
            data["language"] = proposal["targetLanguage"]
    elif operation == "suggest_skills":
        if (
            not target
            or target["type"] != "skills"
            or not isinstance(proposal.get("updatedContent"), dict)
        ):
            raise HTTPException(status_code=400, detail="Invalid skills proposal")
        target["content"] = proposal["updatedContent"]
    elif operation in {
        "update_fields",
        "fill_missing_fields",
        "rewrite_text",
        "add_resume_item",
        "update_section",
    }:
        if not target:
            raise HTTPException(status_code=404, detail="Section not found")
        if operation == "update_section" and isinstance(proposal.get("newValue"), dict):
            target["content"] = proposal["newValue"]
        elif operation == "add_resume_item":
            collection = "categories" if target["type"] == "skills" else "items"
            change = next(
                (
                    value
                    for value in proposal.get("changes", [])
                    if isinstance(value, dict) and isinstance(value.get("newValue"), dict)
                ),
                None,
            )
            if not change:
                raise HTTPException(status_code=400, detail="Invalid item proposal")
            target["content"][collection] = [
                *target["content"].get(collection, []),
                deepcopy(change["newValue"]),
            ]
        else:
            edit_target = target["content"]
            if proposal.get("itemId"):
                collection = "categories" if target["type"] == "skills" else "items"
                edit_target = next(
                    (
                        value
                        for value in edit_target.get(collection, [])
                        if isinstance(value, dict) and value.get("id") == proposal["itemId"]
                    ),
                    None,
                )
                if edit_target is None:
                    raise HTTPException(status_code=404, detail="Resume item not found")
            for change in proposal.get("changes", []):
                if not isinstance(change, dict) or change.get("newValue") is None:
                    continue
                field = change.get("field")
                if not isinstance(field, str) or field in {"__proto__", "prototype", "constructor"}:
                    continue
                if operation == "fill_missing_fields":
                    old_value = edit_target.get(field)
                    if old_value is not None and old_value != "" and old_value != []:
                        continue
                edit_target[field] = change["newValue"]
    else:
        raise HTTPException(status_code=400, detail="Unsupported edit operation")
    data["expectedVersion"] = proposal.get("expectedVersion", resume.version)
    updated = await update_resume(session, resume, data)
    return {"success": True, "resume": resume_dto(updated)}
