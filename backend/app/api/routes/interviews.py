import asyncio
import base64
import io
import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

import websockets
from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.ai.interview_panel import select_panel_speaker
from app.ai.interview_text import InterviewTextFilter, clean_interview_text
from app.ai.prompts import INTERVIEW_REPORT_PROMPT, build_interview_system_prompt
from app.ai.provider import AIClient, AIConfigurationError
from app.ai.workflows import run_structured_completion, stream_completion
from app.api.dependencies import Session, WorkspaceOwner
from app.runtime_credentials import get_runtime_settings
from app.db.models import (
    InterviewMessage,
    InterviewReport,
    InterviewRound,
    InterviewSession,
)
from app.services.resumes import owned_resume, resume_dto

router = APIRouter(prefix="/api/interview", tags=["interview"])

# Verified against the official Qwen-Audio-TTS Flash base voice catalog.
TTS_VOICES = {
    "hr": "qwen-audio-3.0-tts-flash-longyingmuyu",
    "technical": "qwen-audio-3.0-tts-flash-longqinheying",
    "scenario": "qwen-audio-3.0-tts-flash-longyanhuilu",
    "behavioral": "qwen-audio-3.0-tts-flash-longtongshuoxiu",
    "project_deep_dive": "qwen-audio-3.0-tts-flash-longhuifengyi",
    "leader": "qwen-audio-3.0-tts-flash-longlinyuemo",
    "creative": "qwen-audio-3.0-tts-flash-longjunhuixia",
    "product": "qwen-audio-3.0-tts-flash-longlanlurong",
    "engineering": "qwen-audio-3.0-tts-flash-longxiamuyan",
    "finance": "qwen-audio-3.0-tts-flash-longyaoxuanzhi",
    "education": "qwen-audio-3.0-tts-flash-longchezhuyu",
    "health": "qwen-audio-3.0-tts-flash-longruimoliu",
    "legal": "qwen-audio-3.0-tts-flash-longyingfengmu",
    "sales": "qwen-audio-3.0-tts-flash-longxinruixuan",
    "service": "qwen-audio-3.0-tts-flash-longfengyueyao",
    "agriculture": "qwen-audio-3.0-tts-flash-longqinxinque",
}

TTS_PROFILES = {"hr": {"rate": 1.0, "pitch": 1.0, "volume": 50.0}}


def interviewer_voice_type(speaker: dict[str, Any]) -> str:
    role = str(speaker.get("type") or "")
    if role in TTS_VOICES:
        return role
    voice_type = str(speaker.get("voiceType") or "hr")
    return voice_type if voice_type in TTS_VOICES else "hr"


# All interview voices, including custom-role fallbacks, use Flash.
INTERVIEW_TTS_MODEL = "qwen-audio-3.0-tts-flash"


@router.post("/voice-preview")
async def preview_interviewer_voice(user: WorkspaceOwner, body: dict[str, Any] = Body(...)):
    settings = get_runtime_settings()
    if not settings.dashscope_api_key:
        raise HTTPException(503, "音色试听服务暂不可用")
    role = interviewer_voice_type(body)
    profile = TTS_PROFILES.get(role, {"rate": 1.0, "pitch": 1.0, "volume": 50.0})
    voice = TTS_VOICES[role]
    url = settings.dashscope_websocket_url
    if not url and settings.dashscope_workspace_id:
        url = f"wss://{settings.dashscope_workspace_id}.cn-beijing.maas.aliyuncs.com/api-ws/v1/inference"
    headers = {"Authorization": f"Bearer {settings.dashscope_api_key}"}
    if settings.dashscope_workspace_id:
        headers["X-DashScope-WorkSpace"] = settings.dashscope_workspace_id
    task_id = uuid4().hex
    chunks: list[bytes] = []
    try:
        async with asyncio.timeout(30):
            async with websockets.connect(url or "wss://dashscope.aliyuncs.com/api-ws/v1/inference", additional_headers=headers, open_timeout=10) as socket:
                async def send(action: str, payload: dict[str, Any]):
                    await socket.send(json.dumps({"header": {"action": action, "task_id": task_id, "streaming": "duplex"}, "payload": payload}))
                await send("run-task", {
                    "task_group": "audio", "task": "tts", "function": "SpeechSynthesizer",
                    "model": INTERVIEW_TTS_MODEL,
                    "parameters": {"text_type": "PlainText", "voice": voice, "format": "mp3", "sample_rate": 22050, "bit_rate": 64, **profile, "enable_ssml": False},
                    "input": {},
                })
                async for message in socket:
                    if isinstance(message, bytes):
                        chunks.append(message)
                        continue
                    event = json.loads(message).get("header", {}).get("event")
                    if event == "task-started":
                        await send("continue-task", {"input": {"text": "你好，很高兴与你交流。准备好后，我们就开始今天的面试。"}})
                        await send("finish-task", {"input": {}})
                    elif event == "task-failed":
                        raise RuntimeError("Voice preview failed")
                    elif event == "task-finished":
                        if not chunks:
                            raise RuntimeError("Empty voice preview")
                        return Response(b"".join(chunks), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})
                raise RuntimeError("Voice preview ended early")
    except Exception as exc:
        raise HTTPException(502, "音色试听暂未成功，请稍后重试") from exc


def session_dto(item: InterviewSession, name: str = "") -> dict[str, Any]:
    return {
        "id": item.id,
        "userId": item.user_id,
        "resumeId": item.resume_id,
        "jobDescription": item.job_description,
        "jobTitle": item.job_title,
        "name": name or item.job_title,
        "selectedInterviewers": item.selected_interviewers,
        "interactionMode": item.interaction_mode,
        "currentRound": item.current_round,
        "status": item.status,
        "createdAt": item.created_at.isoformat(),
        "updatedAt": item.updated_at.isoformat(),
    }


def round_dto(item: InterviewRound) -> dict[str, Any]:
    return {
        "id": item.id,
        "sessionId": item.session_id,
        "interviewerType": item.interviewer_type,
        "interviewerConfig": item.interviewer_config,
        "sortOrder": item.sort_order,
        "status": item.status,
        "questionCount": item.question_count,
        "maxQuestions": item.max_questions,
        "summary": item.summary,
        "createdAt": item.created_at.isoformat(),
        "updatedAt": item.updated_at.isoformat(),
    }


def message_dto(item: InterviewMessage) -> dict[str, Any]:
    return {
        "id": item.id,
        "roundId": item.round_id,
        "role": item.role,
        "content": item.content,
        "metadata": item.message_metadata,
        "createdAt": item.created_at.isoformat(),
    }


def _score(value: Any, default: int = 0) -> int:
    try:
        score = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(0, min(100, score))


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def normalize_dimension_scores(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        entries = [
            {"dimension": name, **(score if isinstance(score, dict) else {"score": score})}
            for name, score in value.items()
        ]
    elif isinstance(value, list):
        entries = value
    else:
        return []

    result = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        dimension = str(
            entry.get("dimension") or entry.get("name") or entry.get("label") or ""
        ).strip()
        if not dimension:
            continue
        result.append(
            {
                "dimension": dimension,
                "score": _score(entry.get("score")),
                "maxScore": _score(entry.get("maxScore"), 100) or 100,
            }
        )
    return result


def normalize_round_evaluations(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    result = []
    for entry in value:
        if not isinstance(entry, dict):
            continue
        questions = []
        raw_questions = entry.get("questions")
        if isinstance(raw_questions, list):
            for question in raw_questions:
                if not isinstance(question, dict):
                    continue
                questions.append(
                    {
                        "question": str(question.get("question") or ""),
                        "answerSummary": str(question.get("answerSummary") or ""),
                        "score": _score(question.get("score")),
                        "highlights": _string_list(question.get("highlights")),
                        "weaknesses": _string_list(question.get("weaknesses")),
                        "referenceTips": str(question.get("referenceTips") or ""),
                        "marked": bool(question.get("marked", False)),
                        "hinted": bool(question.get("hinted", False)),
                        "skipped": bool(question.get("skipped", False)),
                    }
                )
        result.append(
            {
                "roundId": str(entry.get("roundId") or ""),
                "interviewerType": str(entry.get("interviewerType") or ""),
                "interviewerName": str(entry.get("interviewerName") or ""),
                "score": _score(entry.get("score")),
                "feedback": str(entry.get("feedback") or entry.get("summary") or ""),
                "questions": questions,
            }
        )
    return result


def normalize_improvement_plan(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, dict):
        entries = [
            {
                "area": area,
                **(detail if isinstance(detail, dict) else {"description": detail}),
            }
            for area, detail in value.items()
        ]
    elif isinstance(value, list):
        entries = value
    else:
        return []

    priorities = ("high", "medium", "low")
    result = []
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            continue
        priority = str(entry.get("priority") or "").lower()
        if priority not in priorities:
            priority = priorities[min(index, len(priorities) - 1)]
        result.append(
            {
                "priority": priority,
                "area": str(entry.get("area") or entry.get("title") or ""),
                "description": str(
                    entry.get("description") or entry.get("plan") or entry.get("content") or ""
                ),
                "resources": _string_list(entry.get("resources")),
            }
        )
    return result


def report_dto(item: InterviewReport) -> dict[str, Any]:
    return {
        "id": item.id,
        "sessionId": item.session_id,
        "overallScore": item.overall_score,
        "dimensionScores": normalize_dimension_scores(item.dimension_scores),
        "roundEvaluations": normalize_round_evaluations(item.round_evaluations),
        "overallFeedback": item.overall_feedback,
        "improvementPlan": normalize_improvement_plan(item.improvement_plan),
        "createdAt": item.created_at.isoformat(),
    }


async def owned_interview(
    session: Session, user: WorkspaceOwner, interview_id: str
) -> InterviewSession:
    item = await session.get(InterviewSession, interview_id)
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Interview not found")
    return item


async def child_round(session: Session, interview_id: str, round_id: str) -> InterviewRound:
    item = await session.get(InterviewRound, round_id)
    if not item or item.session_id != interview_id:
        raise HTTPException(status_code=404, detail="Round not found")
    return item


@router.get("")
async def list_interviews(session: Session, user: WorkspaceOwner) -> list[dict]:
    rows = (
        await session.scalars(
            select(InterviewSession)
            .where(InterviewSession.user_id == user.id)
            .order_by(InterviewSession.created_at.desc())
        )
    ).all()
    names = dict((await session.execute(select(InterviewRound.session_id, InterviewRound.interviewer_config)
        .join(InterviewSession, InterviewSession.id == InterviewRound.session_id)
        .where(InterviewSession.user_id == user.id, InterviewRound.sort_order == 0))).all())
    return [session_dto(item, (names.get(item.id) or {}).get("sessionName", "")) for item in rows]


@router.post("", status_code=201)
async def create_interview(session: Session, user: WorkspaceOwner, body: dict = Body(...)) -> dict:
    job_description = str(body.get("jobDescription") or "").strip()
    job_title = str(body.get("jobTitle") or "").strip()
    interviewers = body.get("interviewers")
    mode = body.get("interactionMode", "text")
    if (
        not job_description
        or not job_title
        or not isinstance(interviewers, list)
        or not interviewers
        or mode not in {"text", "voice"}
    ):
        raise HTTPException(status_code=422, detail="Invalid interview request")
    if len(interviewers) > 6 or any(not isinstance(p, dict) or not p.get("type") or not p.get("name") for p in interviewers):
        raise HTTPException(status_code=422, detail="请选择 1 至 6 位面试官")
    if len({p['type'] for p in interviewers}) != len(interviewers):
        raise HTTPException(status_code=422, detail="面试官不能重复")
    # Keep the panel in the existing JSON config: historical sequential rounds remain compatible.
    panel_mode = True
    resume_id = body.get("resumeId")
    if resume_id:
        await owned_resume(session, user, str(resume_id))
    item = InterviewSession(
        user_id=user.id,
        resume_id=resume_id,
        job_description=job_description,
        job_title=job_title,
        selected_interviewers=interviewers,
        interaction_mode=mode,
    )
    session.add(item)
    await session.flush()
    rounds = []
    configs = [{**interviewers[0], "panelInterviewers": interviewers}] if panel_mode else interviewers
    for index, config in enumerate(configs):
        if index == 0:
            config = {**config, "sessionName": str(body.get("name") or job_title)[:100]}
        current = InterviewRound(
            session_id=item.id,
            interviewer_type=str(config.get("type") or "hr"),
            interviewer_config=config,
            sort_order=index,
            max_questions=8 if panel_mode else max(1, min(20, int(config.get("maxQuestions", 10)))),
        )
        session.add(current)
        rounds.append(current)
    await session.commit()
    return {"session": session_dto(item, str(body.get("name") or job_title)[:100]), "rounds": [round_dto(value) for value in rounds]}


@router.get("/history/stats")
async def interview_stats(session: Session, user: WorkspaceOwner) -> dict:
    rows = (
        await session.execute(
            select(InterviewSession, InterviewReport)
            .join(InterviewReport, InterviewReport.session_id == InterviewSession.id)
            .where(InterviewSession.user_id == user.id)
            .order_by(InterviewSession.created_at.desc())
        )
    ).all()
    return {
        "sessions": [
            {
                "id": item.id,
                "jobTitle": item.job_title,
                "overallScore": report.overall_score,
                "dimensionScores": normalize_dimension_scores(report.dimension_scores),
                "createdAt": item.created_at.isoformat(),
            }
            for item, report in rows
        ]
    }


@router.get("/{interview_id}")
async def get_interview(interview_id: str, session: Session, user: WorkspaceOwner) -> dict:
    item = await owned_interview(session, user, interview_id)
    rounds = (
        await session.scalars(
            select(InterviewRound)
            .where(InterviewRound.session_id == interview_id)
            .order_by(InterviewRound.sort_order)
        )
    ).all()
    result = []
    for current in rounds:
        messages = (
            await session.scalars(
                select(InterviewMessage)
                .where(InterviewMessage.round_id == current.id)
                .order_by(InterviewMessage.created_at)
            )
        ).all()
        result.append(
            {**round_dto(current), "messages": [message_dto(value) for value in messages]}
        )
    report = await session.scalar(
        select(InterviewReport).where(InterviewReport.session_id == interview_id)
    )
    return {
        "session": session_dto(item, rounds[0].interviewer_config.get("sessionName", "") if rounds else ""),
        "rounds": result,
        "report": report_dto(report) if report else None,
    }


@router.put("/{interview_id}")
async def update_interview(
    interview_id: str, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict:
    item = await owned_interview(session, user, interview_id)
    if body.get("status") in {"preparing", "in_progress", "paused", "completed"}:
        item.status = body["status"]
    await session.commit()
    return session_dto(item)


@router.delete("/{interview_id}", status_code=204)
async def delete_interview(interview_id: str, session: Session, user: WorkspaceOwner) -> None:
    item = await owned_interview(session, user, interview_id)
    await session.delete(item)
    await session.commit()


@router.post("/{interview_id}/control")
async def control_interview(
    interview_id: str, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict:
    item = await owned_interview(session, user, interview_id)
    action = body.get("action")
    round_id = body.get("roundId")
    current = await child_round(session, interview_id, str(round_id)) if round_id else None
    if action == "pause":
        item.status = "paused"
    elif action == "resume":
        item.status = "in_progress"
    elif action == "end_interview":
        rounds = (await session.scalars(select(InterviewRound).where(InterviewRound.session_id == interview_id))).all()
        for value in rounds:
            if value.status not in {"completed", "skipped"}:
                value.status = "completed" if current and value.id == current.id else "skipped"
        item.status = "completed"
    elif action == "end_round" and current:
        current.status = "completed"
        rounds = (
            await session.scalars(
                select(InterviewRound)
                .where(InterviewRound.session_id == interview_id)
                .order_by(InterviewRound.sort_order)
            )
        ).all()
        index = next(index for index, value in enumerate(rounds) if value.id == current.id)
        if index + 1 < len(rounds):
            item.current_round = index + 1
        else:
            item.status = "completed"
    elif action in {"skip", "hint"} and current:
        text = (
            "候选人选择跳过本题。" if action == "skip" else "请给候选人一个不直接透露答案的提示。"
        )
        session.add(
            InterviewMessage(
                round_id=current.id,
                role="system",
                content=text,
                message_metadata={"skipped": action == "skip", "hinted": action == "hint"},
            )
        )
    else:
        raise HTTPException(status_code=400, detail="Unknown action")
    await session.commit()
    return {"success": True}


@router.post("/{interview_id}/mark")
async def mark_message(
    interview_id: str, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> dict:
    await owned_interview(session, user, interview_id)
    message = await session.get(InterviewMessage, str(body.get("messageId") or ""))
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    await child_round(session, interview_id, message.round_id)
    message.message_metadata = {
        **(message.message_metadata or {}),
        "marked": bool(body.get("marked")),
    }
    await session.commit()
    return {"success": True}


@router.post("/{interview_id}/chat")
async def interview_chat(
    interview_id: str, request: Request, session: Session, user: WorkspaceOwner, body: dict = Body(...)
) -> StreamingResponse:
    item = await owned_interview(session, user, interview_id)
    current = await child_round(session, interview_id, str(body.get("roundId") or ""))
    if current.status in {"completed", "skipped"} or item.status == "completed":
        raise HTTPException(status_code=409, detail="本次面试已结束，请查看报告或开始新面试")
    panel = current.interviewer_config.get("panelInterviewers") or []
    messages = body.get("messages") if isinstance(body.get("messages"), list) else []
    history_rows = (await session.scalars(select(InterviewMessage).where(
        InterviewMessage.round_id == current.id).order_by(InterviewMessage.created_at))).all()
    history = [message_dto(m) for m in history_rows]
    is_hint = bool(history and history[-1]["role"] == "system" and history[-1].get("metadata", {}).get("hinted"))
    content = ""
    if messages:
        parts = messages[-1].get("parts") or []
        content = messages[-1].get("content") or "".join(
            part.get("text", "") for part in parts if isinstance(part, dict)
        )
        if messages[-1].get("role") == "user" and content:
            client_id = str(messages[-1].get("id") or "")
            already_saved = any(m.get("metadata", {}).get("clientMessageId") == client_id for m in history) if client_id else False
            if not already_saved:
                metadata = {"clientMessageId": client_id, "hintRequest": is_hint}
                session.add(InterviewMessage(round_id=current.id, role="candidate", content=content, message_metadata=metadata))
                history.append({"role": "candidate", "content": content, "metadata": metadata})
    is_hint = is_hint or bool(history and (history[-1].get("metadata") or {}).get("hintRequest"))
    resume_text = ""
    if item.resume_id:
        resume_text = resume_dto(await owned_resume(session, user, item.resume_id)).__str__()
    if panel:
        messages = [{"role": "assistant" if m["role"] == "interviewer" else "user",
                     "content": clean_interview_text(m["content"], panel) if m["role"] == "interviewer" else m["content"]}
                    for m in history if m["role"] != "system"]
    current.status = "in_progress"
    item.status = "in_progress"
    await session.commit()
    system = build_interview_system_prompt(
        current.interviewer_config,
        item.job_description,
        resume_text,
        current.max_questions,
        str(body.get("locale") or "zh"),
    )

    async def stream() -> AsyncIterator[str]:
        text_id = "text-1"
        message_id = str(uuid4())
        speaker = current.interviewer_config
        speaker_ready = asyncio.Event()
        question_number = current.question_count + (0 if is_hint else 1)
        for chunk in (
            {"type": "start", "messageId": message_id},
            {"type": "start-step"},
            {"type": "text-start", "id": text_id},
        ):
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        output: list[str] = []
        event_queue: asyncio.Queue[str | None] = asyncio.Queue()
        tts_text_queue: asyncio.Queue[str | None] = asyncio.Queue()
        settings = get_runtime_settings()
        wants_realtime_audio = item.interaction_mode == "voice"
        realtime_audio_enabled = wants_realtime_audio and bool(settings.dashscope_api_key)

        async def emit(payload: dict[str, Any]) -> None:
            await event_queue.put(f"data: {json.dumps(payload, ensure_ascii=False)}\n\n")

        async def model_worker() -> None:
            nonlocal speaker
            marker_pending = ""
            control_pending = ""
            suppress_completion = is_hint or current.question_count < current.max_questions
            try:
                client = AIClient(thinking_enabled=False)
                turn_system = system
                if panel:
                    decision = await select_panel_speaker(client=client, panel=panel, history=history,
                                                          job=item.job_description, max_questions=current.max_questions)
                    speaker = decision["speaker"]
                    turn_system = build_interview_system_prompt(speaker, item.job_description, resume_text,
                                                                current.max_questions, str(body.get("locale") or "zh"))
                    turn_system += ("\n这是多人共同面试，你只扮演本次选中的面试官。其他人的发言均为历史上下文。"
                                    "每次只问一个问题，不替候选人回答。切换面试官时可简短自然交接，不重复完整自我介绍。"
                                    "岗位不是软件岗位时，不使用编程、系统设计等无关问题。"
                                    f"本次方向：{decision['focus']}。已问 {current.question_count} 个主要问题，总数 {current.max_questions}。")
                    if is_hint:
                        turn_system += "当前只提供提示，不新增问题、不结束面试。"
                    elif current.question_count >= current.max_questions:
                        turn_system += "面试问题已全部回答，现在简短总结，不再提问，末尾必须输出 [ROUND_COMPLETE]。"
                    else:
                        turn_system += "本次继续面试，不得输出 [ROUND_COMPLETE]。"
                if not panel:
                    turn_system += f"\n本轮由你独立面试，已问 {current.question_count} 道主要问题，总数 {current.max_questions}。"
                    if is_hint:
                        turn_system += "当前只提供提示，不新增问题、不结束本轮。"
                    elif current.question_count >= current.max_questions:
                        turn_system += "本轮问题已全部回答，简短总结，不再提问，末尾必须输出 [ROUND_COMPLETE]。"
                    else:
                        turn_system += "继续本轮，每次只问一道问题，不得提前输出 [ROUND_COMPLETE]。"
                turn_system += "\n只输出自然对话正文，不输出姓名前缀、[姓名]、角色标签、选择角色的过程或舞台指示。发言者身份由系统单独展示。"
                text_filter = InterviewTextFilter(panel or [speaker])
                await emit({"type": "message-metadata", "messageMetadata": {"speaker": speaker, "hinted": is_hint, "questionNumber": min(question_number, current.max_questions)}})
                await emit({"type": "data-interview-speaker", "data": {"speaker": speaker, "questionNumber": min(question_number, current.max_questions)}, "transient": True})
                speaker_ready.set()
                async for event in stream_completion(client, system=turn_system, messages=messages):
                    if event["type"] != "text":
                        continue
                    delta = text_filter.feed(str(event["delta"]))
                    if not delta:
                        continue
                    if suppress_completion:
                        control_pending += delta
                        control_pending = control_pending.replace("[ROUND_COMPLETE]", "")
                        # Hold only a possible marker prefix across streamed chunks.
                        marker = "[ROUND_COMPLETE]"
                        keep = next((n for n in range(len(marker) - 1, 0, -1)
                                     if control_pending.endswith(marker[:n])), 0)
                        delta = control_pending[:-keep] if keep else control_pending
                        control_pending = control_pending[-keep:] if keep else ""
                        if not delta:
                            continue
                    output.append(delta)
                    await emit({"type": "text-delta", "id": text_id, "delta": delta})
                    if not realtime_audio_enabled:
                        continue

                    # Keep a possible control marker out of speech while forwarding all
                    # ordinary model deltas to the same live TTS task immediately.
                    marker_pending += delta
                    marker_start = marker_pending.find("[")
                    if marker_start < 0:
                        await tts_text_queue.put(marker_pending)
                        marker_pending = ""
                    elif marker_start > 0:
                        await tts_text_queue.put(marker_pending[:marker_start])
                        marker_pending = marker_pending[marker_start:]

                control_pending += text_filter.flush()
                if control_pending:
                    output.append(control_pending)
                    await emit({"type": "text-delta", "id": text_id, "delta": control_pending})
                    marker_pending += control_pending
                if realtime_audio_enabled:
                    remainder = marker_pending.replace("[ROUND_COMPLETE]", "")
                    if remainder:
                        await tts_text_queue.put(remainder)
                full = "".join(output)
                if not full.strip():
                    raise ValueError("面试官暂未返回内容，请重试")
                if not is_hint and current.question_count >= current.max_questions and "[ROUND_COMPLETE]" not in full:
                    full += "[ROUND_COMPLETE]"
                    await emit({"type": "text-delta", "id": text_id, "delta": "[ROUND_COMPLETE]"})
                async with request.app.state.session_factory() as save_session:
                    save_round = await save_session.get(InterviewRound, current.id)
                    save_interview = await save_session.get(InterviewSession, interview_id)
                    save_session.add(
                        InterviewMessage(id=message_id, round_id=current.id, role="interviewer", content=full, message_metadata={"speaker": speaker, "hinted": is_hint, "questionNumber": min(question_number, current.max_questions)})
                    )
                    if save_round:
                        if not is_hint and "[ROUND_COMPLETE]" not in full:
                            save_round.question_count += 1
                        if "[ROUND_COMPLETE]" in full:
                            save_round.status = "completed"
                    if save_interview and save_round and save_round.status == "completed":
                        rounds = (
                            await save_session.scalars(
                                select(InterviewRound)
                                .where(InterviewRound.session_id == interview_id)
                                .order_by(InterviewRound.sort_order)
                            )
                        ).all()
                        index = next(
                            index for index, value in enumerate(rounds) if value.id == save_round.id
                        )
                        if index + 1 < len(rounds):
                            save_interview.current_round = index + 1
                        else:
                            save_interview.status = "completed"
                    await save_session.commit()
            except Exception as error:
                await emit({"type": "error", "errorText": '服务调用失败，请检查 API Key、模型及服务地址后重试。'})
            finally:
                speaker_ready.set()
                if realtime_audio_enabled:
                    await tts_text_queue.put(None)
                await event_queue.put(None)

        async def tts_worker() -> None:
            socket = None
            task_id = __import__("uuid").uuid4().hex
            await speaker_ready.wait()
            # Role identity wins over the obsolete male/female voiceType stored
            # in earlier sessions. Custom roles may still choose a voiceType.
            interviewer_type = interviewer_voice_type(speaker)
            profile = TTS_PROFILES.get(
                interviewer_type,
                {"rate": 1.0, "pitch": 1.0, "volume": 50.0},
            )
            voice = (
                TTS_VOICES[interviewer_type]
            )
            url = settings.dashscope_websocket_url
            if not url and settings.dashscope_workspace_id:
                url = (
                    f"wss://{settings.dashscope_workspace_id}.cn-beijing.maas.aliyuncs.com"
                    "/api-ws/v1/inference"
                )
            url = url or "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
            headers = {
                "Authorization": f"Bearer {settings.dashscope_api_key}",
                "User-Agent": "VitaAI/1.0 realtime-interview-tts",
            }
            if settings.dashscope_workspace_id:
                headers["X-DashScope-WorkSpace"] = settings.dashscope_workspace_id

            try:
                socket = await websockets.connect(url, additional_headers=headers, open_timeout=15)
                await socket.send(
                    json.dumps(
                        {
                            "header": {
                                "action": "run-task",
                                "task_id": task_id,
                                "streaming": "duplex",
                            },
                            "payload": {
                                "task_group": "audio",
                                "task": "tts",
                                "function": "SpeechSynthesizer",
                                "model": INTERVIEW_TTS_MODEL,
                                "parameters": {
                                    "text_type": "PlainText",
                                    "voice": voice,
                                    "format": "mp3",
                                    "sample_rate": 22050,
                                    "bit_rate": 64,
                                    "volume": profile["volume"],
                                    "rate": profile["rate"],
                                    "pitch": profile["pitch"],
                                    "enable_ssml": False,
                                },
                                "input": {},
                            },
                        }
                    )
                )
                while True:
                    started_message = await asyncio.wait_for(socket.recv(), timeout=15)
                    if isinstance(started_message, bytes):
                        continue
                    started_payload = json.loads(started_message)
                    started_event = started_payload.get("header", {}).get("event")
                    if started_event == "task-started":
                        break
                    if started_event == "task-failed":
                        header = started_payload.get("header", {})
                        raise RuntimeError(
                            "DashScope TTS rejected the task: "
                            f"{header.get('error_code', 'unknown')} - "
                            f"{header.get('error_message', 'unknown error')}"
                        )

                await emit(
                    {
                        "type": "data-interview-audio",
                        "data": {"event": "start", "mimeType": "audio/mpeg"},
                        "transient": True,
                    }
                )

                async def receive_audio() -> None:
                    assert socket is not None
                    async for audio_message in socket:
                        if isinstance(audio_message, bytes):
                            await emit(
                                {
                                    "type": "data-interview-audio",
                                    "data": {
                                        "event": "chunk",
                                        "audio": base64.b64encode(audio_message).decode("ascii"),
                                    },
                                    "transient": True,
                                }
                            )
                            continue
                        payload = json.loads(audio_message)
                        audio_event = payload.get("header", {}).get("event")
                        if audio_event == "task-finished":
                            await emit(
                                {
                                    "type": "data-interview-audio",
                                    "data": {"event": "end"},
                                    "transient": True,
                                }
                            )
                            return
                        if audio_event == "task-failed":
                            header = payload.get("header", {})
                            raise RuntimeError(
                                "DashScope TTS stream failed: "
                                f"{header.get('error_code', 'unknown')} - "
                                f"{header.get('error_message', 'unknown error')}"
                            )

                receiver = asyncio.create_task(receive_audio())
                while True:
                    text_delta = await tts_text_queue.get()
                    if text_delta is None:
                        break
                    if not text_delta:
                        continue
                    await socket.send(
                        json.dumps(
                            {
                                "header": {
                                    "action": "continue-task",
                                    "task_id": task_id,
                                    "streaming": "duplex",
                                },
                                "payload": {"input": {"text": text_delta}},
                            }
                        )
                    )
                await socket.send(
                    json.dumps(
                        {
                            "header": {
                                "action": "finish-task",
                                "task_id": task_id,
                                "streaming": "duplex",
                            },
                            "payload": {"input": {}},
                        }
                    )
                )
                await receiver
            except Exception as error:
                await emit(
                    {
                        "type": "data-interview-audio",
                        "data": {"event": "error", "message": '服务调用失败，请检查 API Key、模型及服务地址后重试。'},
                        "transient": True,
                    }
                )
            finally:
                if socket is not None:
                    await socket.close()
                await event_queue.put(None)

        workers = [asyncio.create_task(model_worker())]
        if realtime_audio_enabled:
            workers.append(asyncio.create_task(tts_worker()))
        elif wants_realtime_audio:
            yield f"data: {json.dumps({'type': 'data-interview-audio', 'data': {'event': 'error', 'message': 'DASHSCOPE_API_KEY is not configured'}, 'transient': True}, ensure_ascii=False)}\n\n"

        completed_workers = 0
        try:
            while completed_workers < len(workers):
                queued_event = await event_queue.get()
                if queued_event is None:
                    completed_workers += 1
                else:
                    yield queued_event
            await asyncio.gather(*workers)
        finally:
            for worker in workers:
                if not worker.done():
                    worker.cancel()
            await asyncio.gather(*workers, return_exceptions=True)
        for chunk in (
            {"type": "text-end", "id": text_id},
            {"type": "finish-step"},
            {"type": "finish"},
        ):
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "x-vercel-ai-ui-message-stream": "v1",
            "cache-control": "no-cache, no-transform",
            "x-accel-buffering": "no",
        },
    )


@router.get("/{interview_id}/report")
async def get_report(interview_id: str, session: Session, user: WorkspaceOwner) -> dict:
    await owned_interview(session, user, interview_id)
    report = await session.scalar(
        select(InterviewReport).where(InterviewReport.session_id == interview_id)
    )
    if not report:
        raise HTTPException(status_code=404, detail="No report found")
    return report_dto(report)


@router.post("/{interview_id}/report")
async def create_report(interview_id: str, session: Session, user: WorkspaceOwner) -> dict:
    item = await owned_interview(session, user, interview_id)
    existing = await session.scalar(
        select(InterviewReport).where(InterviewReport.session_id == interview_id)
    )
    if existing:
        return report_dto(existing)
    rounds = (
        await session.scalars(
            select(InterviewRound)
            .where(InterviewRound.session_id == interview_id)
            .order_by(InterviewRound.sort_order)
        )
    ).all()
    transcript = []
    for current in rounds:
        messages = (
            await session.scalars(
                select(InterviewMessage)
                .where(InterviewMessage.round_id == current.id)
                .order_by(InterviewMessage.created_at)
            )
        ).all()
        transcript.append(
            {"round": round_dto(current), "messages": [message_dto(value) for value in messages]}
        )
    try:
        result = await run_structured_completion(
            AIClient(),
            system=INTERVIEW_REPORT_PROMPT + "\n多人面试的每条消息 metadata.speaker 是实际提问者。按实际提问者归纳评估，roundId 保留原值；只评估有真实问答的面试官。维度根据目标行业确定，不对非技术岗位强加编程能力维度。",
            prompt=f"岗位：{item.job_description}\n面试记录：{json.dumps(transcript, ensure_ascii=False)}",
            max_tokens=16384,
        )
    except AIConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    report = InterviewReport(
        session_id=interview_id,
        overall_score=_score(result.get("overallScore")),
        dimension_scores=normalize_dimension_scores(result.get("dimensionScores")),
        round_evaluations=normalize_round_evaluations(result.get("roundEvaluations")),
        overall_feedback=str(result.get("overallFeedback", "")),
        improvement_plan=normalize_improvement_plan(result.get("improvementPlan")),
    )
    session.add(report)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        existing = await session.scalar(
            select(InterviewReport).where(InterviewReport.session_id == interview_id)
        )
        if existing:
            return report_dto(existing)
        raise
    return report_dto(report)


@router.get("/{interview_id}/report/export")
async def export_report(
    interview_id: str, session: Session, user: WorkspaceOwner
) -> StreamingResponse:
    item = await owned_interview(session, user, interview_id)
    report = await session.scalar(
        select(InterviewReport).where(InterviewReport.session_id == interview_id)
    )
    if not report:
        raise HTTPException(status_code=404, detail="No report found")
    buffer = io.BytesIO()
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    pdf = canvas.Canvas(buffer)
    pdf.setFont("STSong-Light", 18)
    y = 800
    pdf.drawString(48, y, f"{item.job_title} - 模拟面试报告")
    y -= 36
    pdf.setFont("STSong-Light", 12)
    lines = [
        f"综合评分：{report.overall_score}",
        "",
        *report.overall_feedback.splitlines(),
        "",
        "能力维度",
        *[
            f"{score.get('dimension', '')}: {score.get('score', 0)}"
            for score in normalize_dimension_scores(report.dimension_scores)
        ],
        "",
        "改进计划",
        *[
            f"{plan.get('area', '')}: {plan.get('description', '')}"
            for plan in normalize_improvement_plan(report.improvement_plan)
        ],
    ]
    for line in lines:
        for start in range(0, max(len(line), 1), 52):
            if y < 48:
                pdf.showPage()
                pdf.setFont("STSong-Light", 12)
                y = 800
            pdf.drawString(48, y, line[start : start + 52])
            y -= 18
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="interview-{interview_id}.pdf"',
        },
    )
