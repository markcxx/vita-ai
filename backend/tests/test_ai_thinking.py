import json

import httpx
import pytest

from app.ai import provider
from app.ai.provider import AIClient
from app.ai.thinking import thinking_capability, thinking_parameters
from app.config import Settings


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.parametrize(("model", "enabled", "expected"), [
    ("deepseek-v4-flash-260425", True, {"thinking": {"type": "enabled"}}),
    ("deepseek-v4-flash-260425", False, {"thinking": {"type": "disabled"}}),
    ("Qwen/Qwen3-32B", False, {"enable_thinking": False}),
    ("qwen-plus", True, {"enable_thinking": True}),
    ("glm-4.7", False, {"thinking": {"type": "disabled"}}),
    ("glm-5.2", True, {"thinking": {"type": "enabled"}}),
    ("deepseek-reasoner", False, {"model": "deepseek-chat"}),
    ("deepseek-chat", True, {"model": "deepseek-reasoner"}),
    ("gpt-4o", False, {}),
    ("qwen3-coder-plus", True, {}),
    ("qwen3-235b-a22b-thinking-2507", False, {}),
    ("glm-5.3", False, {}),
    ("deepseek-v4-flash-260425", None, {}),
])
def test_thinking_parameters(model, enabled, expected):
    assert thinking_parameters(Settings(ai_model=model), enabled) == expected


def test_capabilities_and_gateway_override():
    assert thinking_capability(Settings(ai_model="glm-5.3")) == {
        "supported": False, "defaultEnabled": True, "reason": "当前模型始终开启思考，不支持关闭",
    }
    settings = Settings(ai_model="custom-alias", ai_thinking_mode="enable_thinking")
    assert thinking_capability(settings)["supported"] is True
    assert thinking_capability(settings)["defaultEnabled"] is False
    assert thinking_parameters(settings, False) == {"enable_thinking": False}
    assert thinking_parameters(Settings(ai_model="qwen3-32b", ai_thinking_mode="unsupported"), True) == {}
    assert thinking_parameters(Settings(ai_provider="anthropic", ai_model="qwen3-32b"), True) == {}


@pytest.mark.anyio
@pytest.mark.parametrize("enabled", [True, False])
async def test_mode_reaches_stream_tools_and_completion_without_mutating_settings(monkeypatch, enabled):
    requests = []

    def handle(request):
        body = json.loads(request.content)
        requests.append(body)
        if body.get("stream"):
            return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n\n')
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}]})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(provider.httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handle), **kw))
    settings = Settings(ai_api_key="test", ai_model="deepseek-v4-flash-260425")
    client = AIClient(settings, thinking_enabled=enabled)
    for tool_choice in ("auto", {"type": "function", "function": {"name": "edit"}}):
        events = [event async for event in client.stream_events(
            system="system", messages=[{"role": "user", "content": "hello"}],
            tools=[{"type": "function", "function": {"name": "edit"}}], tool_choice=tool_choice,
        )]
        assert events == [{"type": "text", "delta": "ok"}]
    assert await client.complete(system="system", prompt="hello") == "ok"
    assert all(req["thinking"] == {"type": "enabled" if enabled else "disabled"} for req in requests)
    assert requests[1]["tool_choice"]["function"]["name"] == "edit"
    await AIClient(settings).complete(system="system", prompt="hello")
    assert requests[-1]["thinking"] == {"type": "disabled"}


@pytest.mark.anyio
async def test_qwen_completion_uses_stream_and_returns_only_answer(monkeypatch):
    def handle(request):
        body = json.loads(request.content)
        assert body["stream"] is True
        assert body["enable_thinking"] is True
        return httpx.Response(200, text=(
            'data: {"choices":[{"delta":{"reasoning_content":"reason"}}]}\n\n'
            'data: {"choices":[{"delta":{"content":"answer"}}]}\n\n'
            'data: [DONE]\n\n'
        ))

    real_client = httpx.AsyncClient
    monkeypatch.setattr(provider.httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handle), **kw))
    client = AIClient(Settings(ai_api_key="test", ai_model="qwen3-32b"), thinking_enabled=True)
    assert await client.complete(system="system", prompt="hello") == "answer"
