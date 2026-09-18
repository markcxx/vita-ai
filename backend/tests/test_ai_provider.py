import json

import pytest

from app.ai import provider
from app.ai.provider import AIClient, _messages
from app.ai.tools import resume_tools
from app.config import Settings


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def test_ui_message_tool_results_are_not_exposed_as_assistant_text() -> None:
    result = _messages(
        "system",
        [
            {
                "role": "assistant",
                "parts": [
                    {"type": "text", "text": "已生成修改方案"},
                    {
                        "type": "tool-optimizeResume",
                        "state": "output-available",
                        "input": {"reason": "提升表达"},
                        "output": {
                            "success": True,
                            "changes": [{"field": "text", "newValue": "优化后"}],
                        },
                    },
                ],
            }
        ],
    )

    assert result[1]["role"] == "assistant"
    assert result[1]["content"] == "已生成修改方案"


@pytest.mark.anyio
async def test_openai_compatible_stream_preserves_reasoning_text_and_tool_fragments(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lines = [
        'data: {"choices":[{"delta":{"reasoning_content":"思考"}}]}',
        'data: {"choices":[{"delta":{"content":"回答"}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"edit","arguments":"{\\"value\\":"}}]}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1}"}}]}}]}',
        "data: [DONE]",
    ]

    class FakeResponse:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def aiter_lines(self):
            for line in lines:
                yield line

    class FakeClient:
        def __init__(self, **_: object):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        def stream(self, *_: object, **__: object) -> FakeResponse:
            return FakeResponse()

    monkeypatch.setattr(provider.httpx, "AsyncClient", FakeClient)
    client = AIClient(
        Settings(ai_api_key="test", ai_base_url="https://example.test/v1", ai_model="test")
    )
    events = [
        event
        async for event in client.stream_events(
            system="system",
            messages=[{"role": "user", "content": "hello"}],
            tools=[{"type": "function", "function": {"name": "edit"}}],
        )
    ]

    assert events[:2] == [
        {"type": "reasoning", "delta": "思考"},
        {"type": "text", "delta": "回答"},
    ]
    assert events[2]["type"] == "tool-call"
    assert events[2]["name"] == "edit"
    assert events[2]["arguments"] == json.loads('{"value":1}')


@pytest.mark.anyio
async def test_anthropic_stream_normalizes_langchain_tool_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lines = [
        'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call-a","name":"renameResume","input":{}}}',
        'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"title\\":\\"New\\",\\"reason\\":\\"requested\\"}"}}',
    ]
    captured: dict = {}

    class FakeResponse:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def aiter_lines(self):
            for line in lines:
                yield line

    class FakeClient:
        def __init__(self, **_: object):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        def stream(self, *_: object, **kwargs: object) -> FakeResponse:
            captured.update(kwargs)
            return FakeResponse()

    monkeypatch.setattr(provider.httpx, "AsyncClient", FakeClient)
    client = AIClient(
        Settings(
            ai_provider="anthropic",
            ai_api_key="test",
            ai_base_url="https://example.test",
            ai_model="test",
        )
    )
    tools = resume_tools(["renameResume"], {"title": "Old", "sections": []})
    events = [
        event
        async for event in client.stream_events(
            system="system",
            messages=[{"role": "user", "content": "rename"}],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "renameResume"}},
        )
    ]

    assert captured["json"]["tools"][0]["name"] == "renameResume"
    assert captured["json"]["tool_choice"] == {"type": "tool", "name": "renameResume"}
    assert events == [
        {
            "type": "tool-call",
            "id": "call-a",
            "name": "renameResume",
            "arguments": {"title": "New", "reason": "requested"},
        }
    ]


@pytest.mark.anyio
async def test_gemini_stream_normalizes_langchain_tool_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    lines = [
        'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"renameResume","args":{"title":"New","reason":"requested"}}}]}}]}'
    ]
    captured: dict = {}

    class FakeResponse:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        def raise_for_status(self) -> None:
            return None

        async def aiter_lines(self):
            for line in lines:
                yield line

    class FakeClient:
        def __init__(self, **_: object):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

        def stream(self, *_: object, **kwargs: object) -> FakeResponse:
            captured.update(kwargs)
            return FakeResponse()

    monkeypatch.setattr(provider.httpx, "AsyncClient", FakeClient)
    client = AIClient(
        Settings(
            ai_provider="gemini",
            ai_api_key="test",
            ai_base_url="https://example.test",
            ai_model="test",
        )
    )
    tools = resume_tools(["renameResume"], {"title": "Old", "sections": []})
    events = [
        event
        async for event in client.stream_events(
            system="system",
            messages=[{"role": "user", "content": "rename"}],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "renameResume"}},
        )
    ]

    declaration = captured["json"]["tools"][0]["functionDeclarations"][0]
    assert declaration["name"] == "renameResume"
    assert captured["json"]["toolConfig"]["functionCallingConfig"] == {
        "mode": "ANY",
        "allowedFunctionNames": ["renameResume"],
    }
    assert events[0]["name"] == "renameResume"
    assert events[0]["arguments"] == {"title": "New", "reason": "requested"}
