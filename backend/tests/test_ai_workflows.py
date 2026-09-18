from typing import Any

import pytest

from app.ai.tools import resume_tools
from app.ai.workflows import (
    run_completion,
    run_structured_completion,
    stream_completion,
    stream_resume_chat,
)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


class FakeClient:
    def __init__(
        self,
        streams: list[list[dict[str, Any]]] | None = None,
        completion_outputs: list[str] | None = None,
    ):
        self.streams = list(streams or [])
        self.completion_outputs = list(completion_outputs or [])
        self.completions: list[dict[str, Any]] = []
        self.stream_requests: list[dict[str, Any]] = []

    async def complete(self, **request: Any) -> str:
        self.completions.append(request)
        return self.completion_outputs.pop(0) if self.completion_outputs else '{"result":"ok"}'

    async def stream_events(self, **request: Any):
        self.stream_requests.append(request)
        for event in self.streams.pop(0):
            yield event

@pytest.mark.anyio
async def test_completion_runs_through_graph() -> None:
    client = FakeClient()
    output = await run_completion(
        client,  # type: ignore[arg-type]
        system="system",
        prompt="prompt",
        json_mode=True,
    )

    assert output == '{"result":"ok"}'
    assert client.completions == [
        {
            "system": "system",
            "messages": [],
            "prompt": "prompt",
            "json_mode": True,
            "max_tokens": 8192,
        }
    ]


@pytest.mark.anyio
async def test_structured_completion_generates_and_validates_json_in_graph() -> None:
    client = FakeClient()

    result = await run_structured_completion(
        client,  # type: ignore[arg-type]
        system="system",
        prompt="prompt",
    )

    assert result == {"result": "ok"}
    assert client.completions[0]["json_mode"] is True


@pytest.mark.anyio
async def test_stream_completion_forwards_graph_custom_events() -> None:
    client = FakeClient(
        [[{"type": "reasoning", "delta": "think"}, {"type": "text", "delta": "answer"}]]
    )
    events = [
        event
        async for event in stream_completion(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[],
        )
    ]

    assert events == [
        {"type": "reasoning", "delta": "think"},
        {"type": "text", "delta": "answer"},
    ]


@pytest.mark.anyio
async def test_resume_chat_routes_to_langchain_tool_and_returns_proposal() -> None:
    resume = {
        "id": "resume-1",
        "title": "Original",
        "sections": [
            {
                "id": "summary-1",
                "type": "summary",
                "title": "个人总结",
                "content": {"text": "before"},
            }
        ],
    }
    client = FakeClient(
        [
            [
                {
                    "type": "tool-call",
                    "id": "select-1",
                    "name": "selectResumeTool",
                    "arguments": {"toolName": "rewriteText"},
                }
            ],
            [
                {
                    "type": "tool-call",
                    "id": "rewrite-1",
                    "name": "rewriteText",
                    "arguments": {
                        "sectionId": "summary-1",
                        "field": "text",
                        "improvedText": "after",
                        "reason": "更清晰",
                    },
                }
            ],
        ]
    )

    events = [
        event
        async for event in stream_resume_chat(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[{"role": "user", "content": "优化总结"}],
            resume=resume,
        )
    ]
    custom = [value for mode, value in events if mode == "custom"]
    final = [value for mode, value in events if mode == "values"][-1]

    assert custom[-1]["type"] == "tool-result"
    assert custom[-1]["output"]["operation"] == "rewrite_text"
    assert custom[-1]["output"]["changes"][0] == {
        "field": "text",
        "oldValue": "before",
        "newValue": "after",
    }
    assert final["selected_tool"] == "rewriteText"
    assert final["tool_parts"][0]["toolName"] == "rewriteText"
    assert final["final_text"] == "我已生成一份可审阅的修改方案，请在下方查看并决定是否应用。"
    assert client.stream_requests[0]["tool_choice"] == {
        "type": "function",
        "function": {"name": "selectResumeTool"},
    }


@pytest.mark.anyio
async def test_resume_chat_falls_back_to_structured_arguments_when_model_only_reasons() -> None:
    resume = {
        "id": "resume-1",
        "title": "Original",
        "sections": [
            {
                "id": "summary-1",
                "type": "summary",
                "title": "个人总结",
                "content": {"text": "before"},
            }
        ],
    }
    client = FakeClient(
        streams=[
            [{"type": "reasoning", "delta": "I'll propose a set of changes."}],
            [{"type": "reasoning", "delta": "Let me write the optimizeResume call."}],
        ],
        completion_outputs=[
            '{"toolName":"optimizeResume"}',
            '{"changes":[{"sectionId":"summary-1","field":"text","value":"after"}],'
            '"reason":"提升表达清晰度"}',
        ],
    )

    events = [
        event
        async for event in stream_resume_chat(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[{"role": "user", "content": "帮我修改简历"}],
            resume=resume,
        )
    ]
    custom = [value for mode, value in events if mode == "custom"]
    final = [value for mode, value in events if mode == "values"][-1]

    assert custom[-1]["type"] == "tool-result"
    assert custom[-1]["call"]["id"] == "fallback-optimizeResume"
    assert custom[-1]["output"]["operation"] == "optimize_resume"
    assert final["tool_parts"][0]["result"]["changes"][0]["newValue"] == "after"
    assert final["final_text"] == "我已生成一份可审阅的修改方案，请在下方查看并决定是否应用。"
    assert len(client.completions) == 2


@pytest.mark.anyio
async def test_resume_chat_never_ends_with_reasoning_only_when_tool_generation_fails() -> None:
    client = FakeClient(
        streams=[[{"type": "reasoning", "delta": "thinking"}]],
        completion_outputs=["not json"],
    )

    events = [
        event
        async for event in stream_resume_chat(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[{"role": "user", "content": "帮我修改简历"}],
            resume={"title": "Original", "sections": []},
        )
    ]
    custom = [value for mode, value in events if mode == "custom"]
    final = [value for mode, value in events if mode == "values"][-1]

    assert custom[-1] == {
        "type": "text",
        "delta": "我没能生成有效的简历修改方案，请重新发送一次修改要求。",
    }
    assert final["final_text"] == "我没能生成有效的简历修改方案，请重新发送一次修改要求。"


@pytest.mark.anyio
async def test_approved_proposal_continuation_uses_text_only_model_summary() -> None:
    client = FakeClient(
        streams=[[{"type": "text", "delta": "已经按你的确认完成调整，项目描述现在更突出行动和成果。"}]]
    )

    events = [
        event
        async for event in stream_resume_chat(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[
                {
                    "role": "user",
                    "content": '[[VITAAI_PROPOSAL_EVENT]]{"outcome":"approved"}[[/VITAAI_PROPOSAL_EVENT]]',
                }
            ],
            resume={"title": "Original", "sections": []},
            workflow_event={
                "type": "resume_edit_decision",
                "outcome": "approved",
                "title": "优化简历表达",
                "proposal": {"reason": "强化项目描述的行动导向表达"},
            },
        )
    ]
    custom = [value for mode, value in events if mode == "custom"]
    final = [value for mode, value in events if mode == "values"][-1]

    assert custom == [
        {"type": "text", "delta": "已经按你的确认完成调整，项目描述现在更突出行动和成果。"}
    ]
    assert len(client.stream_requests) == 1
    assert client.stream_requests[0]["tools"] is None
    assert "强化项目描述的行动导向表达" in client.stream_requests[0]["messages"][0]["content"]
    assert final["selected_tool"] is None
    assert final["tool_parts"] == []
    assert final["final_text"] == "已经按你的确认完成调整，项目描述现在更突出行动和成果。"


@pytest.mark.anyio
async def test_approved_proposal_retries_when_stream_has_reasoning_but_no_text() -> None:
    client = FakeClient(
        streams=[[{"type": "reasoning", "delta": "分析本次修改"}]],
        completion_outputs=["本次调整已经应用，个人简介现在更加聚焦目标岗位。"],
    )

    events = [
        event
        async for event in stream_resume_chat(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[],
            resume={"title": "Original", "sections": []},
            workflow_event={
                "type": "resume_edit_decision",
                "outcome": "approved",
                "title": "优化个人简介",
            },
        )
    ]
    custom = [value for mode, value in events if mode == "custom"]
    final = [value for mode, value in events if mode == "values"][-1]

    assert custom[-1] == {
        "type": "text",
        "delta": "本次调整已经应用，个人简介现在更加聚焦目标岗位。",
    }
    assert len(client.completions) == 1
    assert final["final_text"] == "本次调整已经应用，个人简介现在更加聚焦目标岗位。"


@pytest.mark.anyio
async def test_resume_chat_prepares_generation_without_a_jd() -> None:
    client = FakeClient(
        [
            [
                {
                    "type": "tool-call",
                    "id": "generate-1",
                    "name": "prepareTailoredResume",
                    "arguments": {
                        "targetRole": "大模型应用开发工程师",
                        "language": "zh",
                        "reason": "根据候选人档案生成专项简历",
                    },
                }
            ]
        ]
    )

    events = [
        event
        async for event in stream_resume_chat(
            client,  # type: ignore[arg-type]
            system="system",
            messages=[{"role": "user", "content": "请根据我的个人信息完成简历的编写"}],
            resume=None,
            profile={"summary": "大模型应用开发经验", "experiences": []},
            profile_version=7,
        )
    ]
    custom = [value for mode, value in events if mode == "custom"]
    final = [value for mode, value in events if mode == "values"][-1]

    assert custom[-1]["type"] == "tool-result"
    assert custom[-1]["output"] == {
        "success": True,
        "requiresTemplateSelection": True,
        "operation": "generate_tailored_resume",
        "title": "生成「大模型应用开发工程师」专项简历",
        "reason": "根据候选人档案生成专项简历",
        "targetRole": "大模型应用开发工程师",
        "jobDescription": "",
        "language": "zh",
        "profileVersion": 7,
    }
    assert final["selected_tool"] is None
    assert final["tool_parts"][0]["toolName"] == "prepareTailoredResume"


def test_resume_tools_are_executable_langchain_tools() -> None:
    tool = resume_tools(["renameResume"], {"title": "Old", "sections": []})[0]

    assert tool.name == "renameResume"
    assert tool.metadata == {"approval": "required", "status": "contract-ready"}
    assert tool.invoke({"title": "New", "reason": "用户要求"})["newValue"] == "New"


def test_optimize_resume_recovers_item_id_for_single_item_section() -> None:
    resume = {
        "sections": [
            {
                "id": "projects-1",
                "type": "projects",
                "title": "项目经历",
                "content": {
                    "items": [
                        {
                            "id": "project-1",
                            "name": "RAG 项目",
                            "description": "负责项目开发",
                        }
                    ]
                },
            }
        ]
    }
    tool = resume_tools(["optimizeResume"], resume)[0]

    result = tool.invoke(
        {
            "scopeSectionId": "projects-1",
            "changes": [
                {
                    "sectionId": "projects-1",
                    "field": "description",
                    "value": "负责 RAG 项目全流程开发与交付",
                    "issue": "原表述过于笼统",
                    "reason": "明确项目场景与职责范围",
                }
            ],
            "reason": "提升行动导向表达",
        }
    )

    assert result["success"] is True
    assert result["changes"][0]["itemId"] == "project-1"
    assert result["changes"][0]["newValue"] == "负责 RAG 项目全流程开发与交付"
