from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock
import json

import pytest
from fastapi import HTTPException
from app.ai.tools import execute_profile_tool, profile_tools
from app.services.resume_material import resolve_resume_material

@pytest.fixture
def anyio_backend():
    return 'asyncio'


def test_empty_library_accepts_conversation_and_basic_only_resume():
    result = execute_profile_tool('prepareTailoredResume', {'targetRole': '工程师', 'candidateInfo': '我叫小林，毕业于测试大学'}, {}, 0)
    assert result['success'] and result['candidateInfo'] == '我叫小林，毕业于测试大学'
    assert execute_profile_tool('prepareTailoredResume', {'targetRole': '个人简历'}, {}, 0)['success']
    assert profile_tools(['prepareProfileUpdate'], {}, 0)[0].invoke({'candidateInfo': '我叫小林', 'reason': '保存资料'})['operation'] == 'prepare_profile_update'

@pytest.mark.anyio
async def test_conversation_material_has_source_ids_and_does_not_mutate_library(monkeypatch):
    original = {'personalInfo': {'fullName': '旧姓名', 'avatar': '/avatar.png'}, 'education': [], 'isSample': False}
    before = deepcopy(original)
    completion = AsyncMock(return_value={'personalInfo': {'fullName': '新姓名'}, 'education': [{'institution': '测试大学'}], 'experiences': [{}]})
    monkeypatch.setattr('app.services.resume_material.run_structured_completion', completion)
    result = await resolve_resume_material(None, original, '我的姓名改为新姓名，毕业于测试大学')
    assert original == before
    assert result['personalInfo']['fullName'] == '新姓名'
    assert result['personalInfo']['avatar'] == '/avatar.png'
    assert result['education'][0]['id']
    assert result['experiences'] == []

@pytest.mark.anyio
async def test_existing_profile_without_conversation_needs_no_extra_model_call(monkeypatch):
    completion = AsyncMock()
    monkeypatch.setattr('app.services.resume_material.run_structured_completion', completion)
    original = {'summary': '已有经历'}
    assert await resolve_resume_material(None, original, None) == original
    completion.assert_not_called()
    with pytest.raises(HTTPException):
        await resolve_resume_material(None, {}, {'invalid': 'object'})

@pytest.mark.anyio
async def test_sample_identity_is_not_mixed_with_real_conversation(monkeypatch):
    completion = AsyncMock(return_value={'personalInfo': {'fullName': '本人'}})
    monkeypatch.setattr('app.services.resume_material.run_structured_completion', completion)
    await resolve_resume_material(None, {'isSample': True, 'personalInfo': {'fullName': '虚构姓名'}}, '我叫本人')
    assert '虚构姓名' not in completion.call_args.kwargs['prompt']

@pytest.mark.anyio
async def test_both_generation_endpoints_work_without_a_profile_row(monkeypatch):
    from app.api.routes import ai
    material = {'personalInfo': {'fullName': '小林'}, 'education': [{'id': 'edu1', 'institution': '测试大学'}]}
    plan = {'summary': '', 'experiences': [], 'education': [{'sourceId': 'edu1'}], 'projects': [], 'skillCategoryIds': [], 'certificationIds': [], 'languageIds': []}
    monkeypatch.setattr('app.services.resume_material.resolve_resume_material', AsyncMock(return_value=material))
    monkeypatch.setattr(ai, 'ai_client', lambda: SimpleNamespace())
    monkeypatch.setattr(ai, 'run_structured_completion', AsyncMock(return_value=plan))
    saved = AsyncMock(return_value=SimpleNamespace(id='resume1', title='个人简历'))
    monkeypatch.setattr(ai, 'create_resume', saved)
    monkeypatch.setattr(ai, 'resume_dto', lambda resume: {'id': resume.id})
    async def stream(*args, **kwargs):
        assert '小林' in kwargs['messages'][0]['content']
        yield {'type': 'text', 'delta': json.dumps(plan)}
    monkeypatch.setattr(ai, 'stream_completion', stream)
    session = SimpleNamespace(scalar=AsyncMock(return_value=None), rollback=AsyncMock())
    user = SimpleNamespace(id='user1')
    body = {'targetRole': '工程师', 'candidateInfo': '我叫小林，毕业于测试大学'}
    result = await ai.tailored_resume(session, user, body)
    assert result['profileVersion'] == 0 and result['resumeId'] == 'resume1'
    response = await ai.stream_tailored_resume(SimpleNamespace(is_disconnected=AsyncMock(return_value=False)), session, user, body)
    events = [json.loads(line) async for line in response.body_iterator]
    assert events[-1]['type'] == 'complete'
    sections = saved.call_args.args[2]['sections']
    assert next(s for s in sections if s['type'] == 'personal_info')['content']['fullName'] == '小林'
    assert next(s for s in sections if s['type'] == 'education')['content']['items'][0]['institution'] == '测试大学'

@pytest.mark.anyio
@pytest.mark.parametrize('editor', [False, True])
async def test_chat_profile_update_is_reviewable_in_both_chat_modes(editor):
    from app.ai.workflows import stream_resume_chat

    class Client:
        async def stream_events(self, **request):
            name = request['tools'][0].name
            if name == 'selectResumeTool':
                yield {'type': 'tool-call', 'id': 'select', 'name': name, 'arguments': {'toolName': 'prepareProfileUpdate'}}
            else:
                yield {'type': 'tool-call', 'id': 'profile', 'name': 'prepareProfileUpdate', 'arguments': {'candidateInfo': '我叫小林', 'reason': '填入资料库'}}

    events = [event async for event in stream_resume_chat(Client(), system='system', messages=[{'role': 'user', 'content': '帮我填写资料库，我叫小林'}], resume={'sections': []} if editor else None, profile={}, profile_version=0)]
    results = [value['output'] for mode, value in events if mode == 'custom' and value.get('type') == 'tool-result' and value.get('output', {}).get('operation') == 'prepare_profile_update']
    assert results and results[0]['candidateInfo'] == '我叫小林'
    assert results[0]['success']
