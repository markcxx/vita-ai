import httpx
import pytest
from fastapi import Request
from sqlalchemy import select

from app.api.dependencies import Session, workspace_owner
from app.api.routes import ai as ai_routes
from app.db.models import User
from app.main import app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client() -> httpx.AsyncClient:
    # Inject distinct persistence owners to test resource isolation without login.
    async def test_user(request: Request, session: Session):
        test_owner = request.headers.get('x-test-owner', 'api-regression-test')
        user = await session.scalar(select(User).where(User.name == test_owner))
        if not user:
            user = User(name=test_owner)
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

    app.dependency_overrides[workspace_owner] = test_user
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
            try:
                yield test_client
            finally:
                app.dependency_overrides.pop(workspace_owner, None)
                from app.db.session import engine
                await engine.dispose()


@pytest.mark.anyio
async def test_profile_editor_contract_and_legacy_data(client: httpx.AsyncClient) -> None:
    headers = {"x-test-owner": "profile-editor-contract"}
    response = await client.get("/api/profile", headers=headers)
    assert response.status_code == 200
    record = response.json()
    data = record["data"]
    assert data["personalInfo"]["fullName"] == ""
    assert data["personalInfo"]["linkedin"] == ""
    assert data["summary"] == ""
    assert data["experiences"] == []
    assert data["preferences"]["targetRoles"] == []

    # Reproduce an existing record created with the old backend defaults.
    from app.db.models import CandidateProfile
    from app.db.session import SessionFactory

    async with SessionFactory() as session:
        profile = await session.get(CandidateProfile, record["id"])
        profile.data = {"basics": {"fullName": "已有姓名"}, "experience": [],
                        "preferences": {"targetRoles": ["工程师"]}}
        await session.commit()
    migrated = (await client.get("/api/profile", headers=headers)).json()["data"]
    assert migrated["personalInfo"]["fullName"] == "已有姓名"
    assert migrated["preferences"]["targetRoles"] == ["工程师"]
    assert migrated["preferences"]["preferredLocations"] == []
    migrated["summary"] = "保留的经历"
    saved = await client.put("/api/profile", headers=headers, json=migrated)
    assert saved.status_code == 200
    reloaded = (await client.get("/api/profile", headers=headers)).json()["data"]
    assert reloaded == saved.json()["data"]
    assert reloaded["summary"] == "保留的经历"
    assert reloaded["personalInfo"]["fullName"] == "已有姓名"


@pytest.mark.anyio
async def test_liveness(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "api"}


@pytest.mark.anyio
async def test_readiness_checks_persistence(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["persistence"] == "ready"


@pytest.mark.anyio
async def test_tool_catalog_exposes_stable_contracts(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/tools")
    assert response.status_code == 200
    payload = response.json()
    assert payload["version"] == "2026-08-25"
    assert {tool["name"] for tool in payload["tools"]} >= {
        "resume.get",
        "resume.create",
        "resume.propose_patch",
    }


@pytest.mark.anyio
async def test_unknown_application_route_is_not_proxied(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/not-implemented", json={"message": "hello"})
    assert response.status_code == 404
    assert not hasattr(app.state, "legacy_api_client")


@pytest.mark.anyio
async def test_unknown_v1_route_is_not_sent_to_legacy(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/not-implemented")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_chat_forwards_reasoning_and_text_as_live_ui_deltas(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    class FakeAIClient:
        async def stream_events(self, **_: object):
            yield {"type": "reasoning", "delta": "先分析"}
            yield {"type": "reasoning", "delta": "再判断"}
            yield {"type": "text", "delta": "第一段"}
            yield {"type": "text", "delta": "第二段"}

    monkeypatch.setattr(ai_routes, "ai_client", lambda: FakeAIClient())
    response = await client.post(
        "/api/ai/chat",
        headers={"x-test-owner": "stream-regression-test"},
        json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "测试"}]}]},
    )

    assert response.status_code == 200
    body = response.text
    assert body.index('"type": "reasoning-start"') < body.index('"delta": "先分析"')
    assert body.count('"type": "reasoning-delta"') == 2
    assert body.index('"type": "text-start"') < body.index('"delta": "第一段"')
    assert body.count('"type": "text-delta"') == 2
    assert body.index('"delta": "第一段"') < body.index('"delta": "第二段"')


@pytest.mark.anyio
async def test_chat_confirms_applied_proposal_with_text_only_model_response(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    class FakeAIClient:
        def __init__(self) -> None:
            self.requests: list[dict] = []

        async def stream_events(self, **request: object):
            self.requests.append(request)
            yield {"type": "text", "delta": "修改已经完成，工作经历的表达现在更精炼、重点更清晰。"}

    fake_client = FakeAIClient()
    monkeypatch.setattr(ai_routes, "ai_client", lambda: fake_client)
    event = (
        '[[VITAAI_PROPOSAL_EVENT]]'
        '{"type":"resume_edit_decision","outcome":"approved","title":"优化简历表达"}'
        '[[/VITAAI_PROPOSAL_EVENT]]'
    )
    response = await client.post(
        "/api/ai/chat",
        headers={"x-test-owner": "approved-proposal-regression-test"},
        json={"messages": [{"role": "user", "parts": [{"type": "text", "text": event}]}]},
    )

    assert response.status_code == 200
    assert '"delta": "修改已经完成，工作经历的表达现在更精炼、重点更清晰。"' in response.text
    assert fake_client.requests[0]["tools"] is None
    assert "Internal tool interaction" not in response.text
    assert "selectResumeTool" not in response.text


@pytest.mark.anyio
async def test_generate_resume_uses_structured_graph_and_persists_sections(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_structured(*_: object, **__: object) -> dict:
        return {
            "personal_info": {"fullName": "测试用户", "jobTitle": "工程师"},
            "summary": {"text": "简介"},
            "work_experience": {"items": []},
            "education": {"items": []},
            "skills": {"categories": []},
            "projects": {"items": []},
        }

    monkeypatch.setattr(ai_routes, "ai_client", lambda: object())
    monkeypatch.setattr(ai_routes, "run_structured_completion", fake_structured)
    response = await client.post(
        "/api/ai/generate-resume",
        headers={"x-test-owner": "generate-graph-test"},
        json={"jobTitle": "后端工程师", "language": "zh"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "后端工程师 - AI生成简历"
    assert [item["type"] for item in payload["sections"]] == [
        "personal_info",
        "summary",
        "work_experience",
        "education",
        "skills",
        "projects",
    ]


@pytest.mark.anyio
async def test_tailored_resume_materializes_graph_plan_from_profile_sources(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = {"x-test-owner": "tailored-graph-test"}
    profile_data = {
        "personalInfo": {"fullName": "测试用户"},
        "experiences": [
            {
                "id": "exp-1",
                "company": "真实公司",
                "position": "工程师",
                "description": "原描述",
                "highlights": [],
                "current": True,
            }
        ],
        "education": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "languages": [],
    }
    profile_response = await client.put("/api/profile", headers=headers, json=profile_data)
    assert profile_response.status_code == 200

    async def fake_structured(*_: object, **__: object) -> dict:
        return {
            "summary": "专项简介",
            "experiences": [
                {"sourceId": "exp-1", "description": "专业改写", "highlights": []}
            ],
            "education": [],
            "projects": [],
            "skillCategoryIds": [],
            "certificationIds": [],
            "languageIds": [],
        }

    monkeypatch.setattr(ai_routes, "ai_client", lambda: object())
    monkeypatch.setattr(ai_routes, "run_structured_completion", fake_structured)
    response = await client.post(
        "/api/ai/tailored-resume",
        headers=headers,
        json={"targetRole": "平台工程师", "jobDescription": "JD", "template": "classic"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] == "平台工程师 - 专项简历"
    work = next(item for item in payload["resume"]["sections"] if item["type"] == "work_experience")
    assert work["content"]["items"][0]["company"] == "真实公司"
    assert work["content"]["items"][0]["description"] == "专业改写"


@pytest.mark.anyio
@pytest.mark.parametrize("template", [
    "folio-banner", "folio-prism", "folio-notebook", "folio-botanical", "folio-line", "folio-aqua",
])
async def test_reference_template_theme_and_edits_persist(client: httpx.AsyncClient, template: str) -> None:
    headers = {"x-test-owner": f"reference-template-{template}"}
    theme = {"primaryColor": "#171717", "accentColor": "#418ac4", "avatarStyle": "circle"}
    created = await client.post("/api/resume", headers=headers, json={
        "title": "模板回归验证", "template": template, "themeConfig": theme,
    })
    assert created.status_code == 201
    resume = created.json()
    assert resume["template"] == template
    assert resume["themeConfig"] == theme
    sections = resume["sections"]
    personal = next(s for s in sections if s["type"] == "personal_info")
    assert not personal["content"].get("avatar")
    personal["content"]["fullName"] = "编辑后的姓名"
    theme["accentColor"] = "#469b78"
    saved = await client.put(f"/api/resume/{resume['id']}", headers=headers, json={
        "sections": sections, "themeConfig": theme,
    })
    assert saved.status_code == 200
    loaded = (await client.get(f"/api/resume/{resume['id']}", headers=headers)).json()
    assert loaded["themeConfig"]["accentColor"] == "#469b78"
    assert next(s for s in loaded["sections"] if s["type"] == "personal_info")["content"]["fullName"] == "编辑后的姓名"
    await client.delete(f"/api/resume/{resume['id']}", headers=headers)


@pytest.mark.anyio
@pytest.mark.parametrize("template", ["classic", "modern", "folio-notebook"])
async def test_styled_exports_through_authorized_api(client: httpx.AsyncClient, template: str) -> None:
    import io
    import shutil
    import unicodedata
    from pathlib import Path

    from pypdf import PdfReader

    renderer = Path(__file__).resolve().parents[2] / "frontend/dist/resume-renderer.cjs"
    if not renderer.is_file() or not shutil.which("node"):
        pytest.skip("Build document renderer before running integration exports")
    headers = {"x-test-owner": f"styled-export-{template}"}
    created = (await client.post("/api/resume", headers=headers, json={
        "template": template, "title": "导出排版测试",
        "themeConfig": {"accentColor": "#418ac4", "primaryColor": "#171717"},
    })).json()
    sections = created["sections"]
    personal = next(s for s in sections if s["type"] == "personal_info")
    personal["content"].update({"fullName": "导出测试", "avatar": "/images/templates/sample-cartoon-avatar-reference.png"})
    await client.put(f"/api/resume/{created['id']}", headers=headers, json={"sections": sections})
    url = f"/api/resume/{created['id']}/export"
    denied = await client.get(url + "?format=pdf", headers={"x-test-owner": "other-export-user"})
    assert denied.status_code in {403, 404}
    html = await client.get(url + "?format=html", headers=headers)
    assert html.status_code == 200
    assert "resume-export" in html.text
    assert "data:image/png;base64," in html.text
    pdf = await client.get(url + "?format=pdf&fitOnePage=true", headers=headers)
    assert pdf.status_code == 200, pdf.text[:200] if pdf.status_code != 200 else ""
    document = PdfReader(io.BytesIO(pdf.content))
    assert len(document.pages) == 1
    text = unicodedata.normalize("NFKC", "".join(page.extract_text() for page in document.pages))
    assert "导出测试" in "".join(text.split())
    assert any(page.images for page in document.pages)
    docx = await client.get(url + "?format=docx", headers=headers)
    assert docx.status_code == 200
    assert docx.content.startswith(b"PK")
    await client.delete(f"/api/resume/{created['id']}", headers=headers)


@pytest.mark.anyio
async def test_template_policy_reaches_generation_and_optimization(client, monkeypatch):
    from app.domain.template_pagination import template_page_guidance

    captured = []

    async def completion(_client, **kwargs):
        captured.append(kwargs)
        return {"summary": "", "experiences": [], "education": [], "projects": [],
                "skillCategoryIds": [], "certificationIds": [], "languageIds": [],
                "proposal": {"operation": "optimize_resume", "changes": []}}

    monkeypatch.setattr(ai_routes, 'ai_client', lambda: object())
    monkeypatch.setattr(ai_routes, 'run_structured_completion', completion)
    headers = {'x-test-owner': 'pagination-policy-contract'}
    await client.get('/api/profile', headers=headers)
    for template in ('ats', 'folio-cloud', 'folio-growth'):
        response = await client.post('/api/ai/tailored-resume', headers=headers, json={
            'targetRole': '项目助理', 'template': template,
        })
        assert response.status_code == 200, response.text
        assert template_page_guidance(template) in captured[-1]['system']
        assert response.json()['resume']['template'] == template
        response = await client.post('/api/ai/generate-resume', headers=headers, json={
            'jobTitle': '项目助理', 'template': template,
        })
        assert response.status_code == 200, response.text
        assert template_page_guidance(template) in captured[-1]['system']
        resume_id = response.json()['resumeId']
        response = await client.post('/api/ai/resume-edit/optimize', headers=headers, json={
            'resumeId': resume_id, 'scope': 'all',
        })
        assert response.status_code == 200, response.text
        assert template_page_guidance(template) in captured[-1]['system']
        assert 'sections' not in captured[-1]['prompt']


@pytest.mark.anyio
async def test_live_resume_stream_previews_then_saves_and_rejects_incomplete_output(client, monkeypatch):
    import json

    headers = {'x-test-owner': 'live-resume-stream'}
    await client.get('/api/profile', headers=headers)
    monkeypatch.setattr(ai_routes, 'ai_client', lambda: object())
    plan = {"summary": "真实生成的总结", "experiences": [], "education": [], "projects": [],
            "skillCategoryIds": [], "certificationIds": [], "languageIds": []}

    async def stream(*args, **kwargs):
        text = json.dumps(plan, ensure_ascii=False)
        yield {'type': 'text', 'delta': text[:20]}
        yield {'type': 'text', 'delta': text[20:]}

    monkeypatch.setattr(ai_routes, 'stream_completion', stream)
    response = await client.post('/api/ai/tailored-resume/stream', headers=headers,
                                 json={'targetRole': '助理', 'template': 'folio-growth'})
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[0]['type'] == 'status'
    assert events[1]['type'] == 'preview'
    assert events[-1]['type'] == 'complete'
    assert events[-1]['resume']['template'] == 'folio-growth'
    previews = [event for event in events if event['type'] == 'preview']
    assert len(previews) >= 2
    assert previews[-1]['sections'][1]['content']['text'] == plan['summary']
    assert previews[0]['sections'][0]['id'] == previews[-1]['sections'][0]['id']
    saved = await client.get('/api/resume/' + events[-1]['resumeId'], headers=headers)
    assert saved.status_code == 200
    count = len((await client.get('/api/resume', headers=headers)).json())

    async def broken(*args, **kwargs):
        yield {'type': 'text', 'delta': '{"summary":"unfinished'}

    monkeypatch.setattr(ai_routes, 'stream_completion', broken)
    response = await client.post('/api/ai/tailored-resume/stream', headers=headers,
                                 json={'targetRole': '助理'})
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[-1]['type'] == 'error'
    assert len((await client.get('/api/resume', headers=headers)).json()) == count


@pytest.mark.anyio
async def test_resume_analysis_upload_history_and_ownership(client, monkeypatch):
    import io

    from docx import Document

    from app.api.routes import resume_analysis

    async def fake_analysis(text, role, jd):
        assert "负责产品设计" in text
        return {"dimensions": {k: {"score": 70, "values": [70]*n, "summary": "说明", "tags": []} for k,n in {"trust":4,"reading":4,"information":3,"match":4,"get":5}.items()}, "issues": [], "strengths": ["项目经历"], "sections": ["工作经历"]}

    monkeypatch.setattr(resume_analysis, "analyze_text", fake_analysis)
    doc = Document()
    doc.add_paragraph("负责产品设计，完成用户访谈与原型设计，推动开发协作与验收。" * 3)
    output = io.BytesIO()
    doc.save(output)
    owner = {"x-test-owner": "analysis-owner"}
    before = (await client.get("/api/resume", headers=owner)).json()
    response = await client.post("/api/resume-analysis", headers=owner, files={"file": ("resume.docx", output.getvalue())})
    assert response.status_code == 200, response.text
    report = response.json()
    assert report["basics"]["pageCount"] is None
    assert report["resumeId"] is None
    assert (await client.get(f'/api/resume-analysis/{report["id"]}', headers=owner)).json() == report
    assert (await client.get("/api/resume-analysis", headers=owner)).json()[0]["id"] == report["id"]
    assert (await client.get("/api/resume", headers=owner)).json() == before
    other = {"x-test-owner": "analysis-other"}
    assert (await client.get(f'/api/resume-analysis/{report["id"]}', headers=other)).status_code == 404
    assert (await client.get("/api/resume-analysis", headers=other)).json() == []
    assert (await client.post("/api/resume-analysis", headers=owner)).status_code == 422


@pytest.mark.anyio
async def test_resume_analysis_internal_source_and_failure(client, monkeypatch):
    from app.api.routes import resume_analysis
    headers = {"x-test-owner": "analysis-internal"}
    resume = (await client.post("/api/resume", headers=headers, json={"title": "待分析简历"})).json()
    sections = resume["sections"]
    personal = next(s for s in sections if s["type"] == "personal_info")
    personal["content"]["fullName"] = "示例用户"
    personal["content"]["jobTitle"] = "负责产品设计，完成用户访谈与原型设计，推动开发协作与验收。" * 3
    await client.put(f'/api/resume/{resume["id"]}', headers=headers, json={"sections": sections})
    async def fake(text, role, jd):
        return {"dimensions": {}, "issues": [], "strengths": [], "sections": []}
    monkeypatch.setattr(resume_analysis, "analyze_text", fake)
    report = await client.post("/api/resume-analysis", headers=headers, data={"resumeId": resume["id"]})
    assert report.status_code == 200
    assert report.json()["resumeId"] == resume["id"]
    assert report.json()["basics"]["charCount"] > 40
    assert (await client.post("/api/resume-analysis", headers={"x-test-owner": "stranger"}, data={"resumeId": resume["id"]})).status_code == 404
    before = (await client.get("/api/resume-analysis", headers=headers)).json()
    async def fail(*args):
        raise ValueError("AI 返回的报告未通过内容校验，请重新分析。")
    monkeypatch.setattr(resume_analysis, "analyze_text", fail)
    failed = await client.post("/api/resume-analysis", headers=headers, data={"resumeId": resume["id"]})
    assert failed.status_code == 502
    assert (await client.get("/api/resume-analysis", headers=headers)).json() == before


@pytest.mark.anyio
async def test_existing_persistence_and_cross_user_permissions(client):
    alice = {'x-test-owner': 'persistence-audit-alice'}
    bob = {'x-test-owner': 'persistence-audit-bob'}
    alice_user = (await client.get('/api/user', headers=alice)).json()
    bob_user = (await client.get('/api/user', headers=bob)).json()
    created = await client.post('/api/resume', headers=alice, json={'title': '持久化检查', 'userId': bob_user['id']})
    assert created.status_code == 201, created.text
    resume = created.json()
    assert resume['userId'] == alice_user['id']
    identifier = resume['id']
    updated = await client.put(f'/api/resume/{identifier}', headers=alice, json={'title': '更新后', 'expectedVersion': resume['version'], 'themeConfig': {'primaryColor': '#123456'}, 'sections': resume['sections']})
    assert updated.status_code == 200, updated.text
    loaded = (await client.get(f'/api/resume/{identifier}', headers=alice)).json()
    assert loaded['title'] == '更新后' and loaded['themeConfig']['primaryColor'] == '#123456'
    assert loaded['sections'] and loaded['version'] > resume['version']
    assert (await client.put(f'/api/resume/{identifier}', headers=alice, json={'title': 'stale', 'expectedVersion': resume['version']})).status_code == 409
    for method, path in [('GET', f'/api/resume/{identifier}'), ('PUT', f'/api/resume/{identifier}'), ('DELETE', f'/api/resume/{identifier}'), ('POST', f'/api/resume/{identifier}/duplicate'), ('GET', f'/api/resume/{identifier}/export'), ('GET', f'/api/resume/{identifier}/shares'), ('POST', f'/api/resume/{identifier}/shares')]:
        result = await client.request(method, path, headers=bob, json={} if method in {'PUT','POST'} else None)
        assert result.status_code == 404, (path, result.text)
    assert all(row['id'] != identifier for row in (await client.get('/api/resume', headers=bob)).json())
    await client.put('/api/profile', headers=alice, json={'summary': '私有资料', 'userId': bob_user['id']})
    assert (await client.get('/api/profile', headers=alice)).json()['data']['summary'] == '私有资料'
    assert (await client.get('/api/profile', headers=bob)).json()['data']['summary'] == ''
    await client.put('/api/user/settings', headers=alice, json={'autoSave': False, 'apiKey': 'do-not-store', 'uiPreferences': {'theme': 'dark', 'apiKey': 'do-not-store'}})
    settings = (await client.get('/api/user/settings', headers=alice)).json()
    assert settings['autoSave'] is False and settings['uiPreferences']['theme'] == 'dark'
    assert 'do-not-store' not in str(settings)
    assert (await client.get('/api/user/settings', headers=bob)).json() == {}
    shared = await client.post(f'/api/resume/{identifier}/shares', headers=alice, json={'password': 'SharePass123', 'label': '私有分享'})
    assert shared.status_code == 201, shared.text
    share = shared.json()
    assert (await client.get(f'/api/resume/{identifier}/shares', headers=alice)).status_code == 200
    assert (await client.get(f'/api/share/{share["token"]}')).status_code == 401
    public = await client.get(f'/api/share/{share["token"]}', params={'password': 'SharePass123'})
    assert public.status_code == 200, public.text
    assert 'sharePassword' not in public.json() and 'userId' not in public.json()
    assert (await client.patch(f'/api/resume/{identifier}/shares/{share["id"]}', headers=bob, json={'isActive':False})).status_code == 404
    assert (await client.patch(f'/api/resume/{identifier}/shares/{share["id"]}', headers=alice, json={'isActive':False})).status_code == 200
    assert (await client.get(f'/api/share/{share["token"]}', params={'password':'SharePass123'})).status_code == 404
    assert (await client.delete(f'/api/resume/{identifier}', headers=alice)).status_code == 200
    assert (await client.get(f'/api/resume/{identifier}', headers=alice)).status_code == 404


@pytest.mark.anyio
async def test_interview_persistence_and_cross_user_permissions(client):
    from app.db.models import InterviewMessage, InterviewReport
    from app.db.session import SessionFactory
    alice = {'x-test-owner': 'interview-audit-alice'}
    bob = {'x-test-owner': 'interview-audit-bob'}
    payload = {'jobTitle':'产品经理','jobDescription':'产品设计与需求分析','interviewers':[{'type':'hr','name':'HR'}], 'interactionMode':'text'}
    response = await client.post('/api/interview', headers=alice, json=payload)
    assert response.status_code == 201, response.text
    item = response.json()
    identifier = item['session']['id']
    async with SessionFactory() as session:
        message = InterviewMessage(round_id=item['rounds'][0]['id'], role='assistant', content='请介绍你的项目经历')
        session.add(message)
        session.add(InterviewReport(session_id=identifier, overall_score=80, dimension_scores=[], round_evaluations=[], overall_feedback='已保存的面试报告', improvement_plan=[]))
        await session.commit()
        message_id = message.id
    await client.put(f'/api/interview/{identifier}', headers=alice, json={'status':'paused'})
    await client.post(f'/api/interview/{identifier}/mark', headers=alice, json={'messageId':message_id,'marked':True})
    restored = (await client.get(f'/api/interview/{identifier}', headers=alice)).json()
    assert restored['session']['status'] == 'paused'
    assert restored['rounds'][0]['messages'][0]['content'] == '请介绍你的项目经历'
    assert restored['report'] is not None
    assert (await client.get(f'/api/interview/{identifier}/report', headers=alice)).status_code == 200
    for method, suffix in [('GET',''),('PUT',''),('DELETE',''),('GET','/report'),('POST','/report'),('GET','/report/export'),('POST','/mark'),('POST','/control'),('POST','/chat')]:
        result = await client.request(method,f'/api/interview/{identifier}{suffix}',headers=bob,json={'messageId':message_id} if method in {'PUT','POST'} else None)
        assert result.status_code == 404, (suffix,result.text)
    assert (await client.get('/api/interview', headers=bob)).json() == []
    assert (await client.delete(f'/api/interview/{identifier}', headers=alice)).status_code == 204
    assert (await client.get(f'/api/interview/{identifier}', headers=alice)).status_code == 404
