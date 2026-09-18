"""LangGraph workflows shared by every model-backed application feature.

The graphs deliberately depend on the small ``AIClient`` port instead of a
provider SDK.  This keeps OpenAI-compatible, Anthropic and Gemini transports
replaceable while making orchestration, routing and streamed events explicit.
"""

import json
from collections.abc import AsyncIterator
from typing import Any, Literal, TypedDict

from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph

from app.ai.provider import AIClient, extract_json
from app.ai.tools import RESUME_TOOL_NAMES, TOOL_BY_NAME, profile_tools, resume_tools


class CompletionState(TypedDict, total=False):
    client: AIClient
    system: str
    messages: list[dict[str, Any]]
    prompt: str | None
    json_mode: bool
    max_tokens: int
    output: str


async def _complete(state: CompletionState) -> CompletionState:
    output = await state["client"].complete(
        system=state["system"],
        messages=state.get("messages"),
        prompt=state.get("prompt"),
        json_mode=state.get("json_mode", False),
        max_tokens=state.get("max_tokens", 8192),
    )
    return {"output": output}


_completion_builder = StateGraph(CompletionState)
_completion_builder.add_node("generate", _complete)
_completion_builder.add_edge(START, "generate")
_completion_builder.add_edge("generate", END)
COMPLETION_GRAPH = _completion_builder.compile(name="model-completion")


async def run_completion(
    client: AIClient,
    *,
    system: str,
    messages: list[dict[str, Any]] | None = None,
    prompt: str | None = None,
    json_mode: bool = False,
    max_tokens: int = 8192,
) -> str:
    result = await COMPLETION_GRAPH.ainvoke(
        {
            "client": client,
            "system": system,
            "messages": list(messages or []),
            "prompt": prompt,
            "json_mode": json_mode,
            "max_tokens": max_tokens,
        }
    )
    return str(result["output"])


class StructuredCompletionState(CompletionState, total=False):
    result: dict[str, Any]


async def _parse_json(state: StructuredCompletionState) -> StructuredCompletionState:
    return {"result": extract_json(state["output"])}


_structured_builder = StateGraph(StructuredCompletionState)
_structured_builder.add_node("generate", _complete)
_structured_builder.add_node("validate_json", _parse_json)
_structured_builder.add_edge(START, "generate")
_structured_builder.add_edge("generate", "validate_json")
_structured_builder.add_edge("validate_json", END)
STRUCTURED_COMPLETION_GRAPH = _structured_builder.compile(name="structured-model-completion")


async def run_structured_completion(
    client: AIClient,
    *,
    system: str,
    messages: list[dict[str, Any]] | None = None,
    prompt: str | None = None,
    max_tokens: int = 8192,
) -> dict[str, Any]:
    result = await STRUCTURED_COMPLETION_GRAPH.ainvoke(
        {
            "client": client,
            "system": system,
            "messages": list(messages or []),
            "prompt": prompt,
            "json_mode": True,
            "max_tokens": max_tokens,
        }
    )
    return dict(result["result"])



class StreamingState(TypedDict, total=False):
    client: AIClient
    system: str
    messages: list[dict[str, Any]]
    final_text: str
    final_reasoning: str


async def _stream_model(state: StreamingState) -> StreamingState:
    writer = get_stream_writer()
    final_text = ""
    final_reasoning = ""
    async for event in state["client"].stream_events(
        system=state["system"], messages=state["messages"]
    ):
        if event["type"] == "text":
            final_text += str(event["delta"])
            writer(event)
        elif event["type"] == "reasoning":
            final_reasoning += str(event["delta"])
            writer(event)
    return {"final_text": final_text, "final_reasoning": final_reasoning}


_streaming_builder = StateGraph(StreamingState)
_streaming_builder.add_node("generate", _stream_model)
_streaming_builder.add_edge(START, "generate")
_streaming_builder.add_edge("generate", END)
STREAMING_GRAPH = _streaming_builder.compile(name="streaming-model-completion")


async def stream_completion(
    client: AIClient,
    *,
    system: str,
    messages: list[dict[str, Any]],
) -> AsyncIterator[dict[str, Any]]:
    async for event in STREAMING_GRAPH.astream(
        {"client": client, "system": system, "messages": messages},
        stream_mode="custom",
    ):
        yield event


class ResumeChatState(TypedDict, total=False):
    client: AIClient
    system: str
    messages: list[dict[str, Any]]
    resume: dict[str, Any] | None
    profile: dict[str, Any]
    profile_version: int
    workflow_event: dict[str, Any] | None
    selected_tool: str | None
    final_text: str
    final_reasoning: str
    tool_parts: list[dict[str, Any]]


async def _select_resume_tool(state: ResumeChatState) -> ResumeChatState:
    writer = get_stream_writer()
    client = state.get("client")
    assert client is not None
    resume = state.get("resume")
    calls: list[dict[str, Any]] = []
    final_text = state.get("final_text", "")
    final_reasoning = state.get("final_reasoning", "")
    if resume:
        tools = resume_tools(["selectResumeTool"], resume)
    else:
        names = ["prepareTailoredResume", "analyzeStudentStrengths"]
        tools = profile_tools(names, state.get("profile", {}), state.get("profile_version", 0))
    async for event in client.stream_events(
        system=state["system"],
        messages=state["messages"],
        tools=tools,
        tool_choice=(
            {"type": "function", "function": {"name": "selectResumeTool"}}
            if resume
            else "auto"
        ),
    ):
        if event["type"] == "text":
            final_text += str(event["delta"])
            writer(event)
        elif event["type"] == "reasoning":
            final_reasoning += str(event["delta"])
            writer(event)
        elif event["type"] == "tool-call":
            calls.append(event)

    selected_tool = None
    tool_parts: list[dict[str, Any]] = []
    selection = next((value for value in calls if value["name"] == "selectResumeTool"), None)
    if selection and resume:
        selected = await tools[0].ainvoke(selection["arguments"])
        candidate = selected.get("selectedTool")
        if candidate in RESUME_TOOL_NAMES:
            selected_tool = str(candidate)
    elif resume:
        try:
            fallback = extract_json(
                await client.complete(
                    system=(
                        f"{state['system']}\nThe provider did not emit the required selector call. "
                        "Return only one JSON object with toolName set to the single best resume "
                        "tool for the latest user request. The object must satisfy this schema: "
                        f"{json.dumps(TOOL_BY_NAME['selectResumeTool'].input_schema, ensure_ascii=False)}"
                    ),
                    messages=state["messages"],
                    json_mode=True,
                    max_tokens=512,
                )
            )
            selected = await tools[0].ainvoke(fallback)
            candidate = selected.get("selectedTool")
            if candidate in RESUME_TOOL_NAMES:
                selected_tool = str(candidate)
        except (ValueError, TypeError, KeyError):
            pass
    elif calls and not resume:
        # A turn can legitimately request more than one action. Do not discard
        # resume generation just because another tool was emitted first.
        executed: set[str] = set()
        for call in calls:
            signature = json.dumps([call["name"], call["arguments"]], sort_keys=True, ensure_ascii=False)
            tool = next((value for value in tools if value.name == call["name"]), None)
            if tool is None or signature in executed:
                continue
            executed.add(signature)
            output = await tool.ainvoke(call["arguments"])
            tool_parts.append(
                {"toolName": call["name"], "args": call["arguments"], "result": output}
            )
            writer({"type": "tool-result", "call": call, "output": output})
    if resume and not selected_tool and not final_text:
        final_text = "我没能生成有效的简历修改方案，请重新发送一次修改要求。"
        writer({"type": "text", "delta": final_text})
    return {
        "selected_tool": selected_tool,
        "final_text": final_text,
        "final_reasoning": final_reasoning,
        "tool_parts": tool_parts,
    }


def _route_after_selection(state: ResumeChatState) -> Literal["invoke_tool", "done"]:
    return "invoke_tool" if state.get("selected_tool") else "done"


def _route_resume_chat(state: ResumeChatState) -> Literal["acknowledge_event", "select_tool"]:
    return "acknowledge_event" if state.get("workflow_event") else "select_tool"


async def _acknowledge_workflow_event(state: ResumeChatState) -> ResumeChatState:
    """Let the model summarize a completed UI transaction without exposing any tools."""
    writer = get_stream_writer()
    client = state.get("client")
    assert client is not None
    event = state.get("workflow_event") or {}
    final_text = ""
    final_reasoning = ""
    confirmation_system = (
        f"{state['system']}\n\n"
        "当前用户消息是前端上报的、已经完成的界面操作结果。"
        "请根据事件中的方案信息和系统提供的最新简历，自然地向用户说明结果，"
        "并简洁总结本次实际修改；不要重新读取简历，不要调用任何工具，不要输出 JSON、"
        "内部事件标记、工具名称或内部执行过程。批准代表修改已经成功落库，不得声称尚未完成。"
    )
    confirmation_messages = [
        {
            "role": "user",
            "content": (
                "请向用户自然说明以下界面操作的结果：\n"
                + json.dumps(event, ensure_ascii=False)
            ),
        }
    ]
    async for model_event in client.stream_events(
        system=confirmation_system,
        messages=confirmation_messages,
        tools=None,
    ):
        if model_event["type"] == "text":
            final_text += str(model_event["delta"])
            writer(model_event)
        elif model_event["type"] == "reasoning":
            final_reasoning += str(model_event["delta"])
            writer(model_event)
    if not final_text.strip():
        final_text = await client.complete(
            system=confirmation_system,
            messages=confirmation_messages,
            max_tokens=1024,
        )
        if final_text:
            writer({"type": "text", "delta": final_text})
    return {
        "selected_tool": None,
        "final_text": final_text,
        "final_reasoning": final_reasoning,
        "tool_parts": [],
    }


async def _invoke_resume_tool(state: ResumeChatState) -> ResumeChatState:
    writer = get_stream_writer()
    client = state.get("client")
    assert client is not None
    selected_tool = state["selected_tool"]
    assert selected_tool is not None
    resume = state.get("resume")
    assert resume is not None
    selected_tools = (profile_tools([selected_tool], state.get("profile", {}), state.get("profile_version", 0))
                      if selected_tool == "analyzeStudentStrengths" else resume_tools([selected_tool], resume))
    calls: list[dict[str, Any]] = []
    final_text = state.get("final_text", "")
    final_reasoning = state.get("final_reasoning", "")
    async for event in client.stream_events(
        system=(
            f"{state['system']}\nThe selector chose {selected_tool}. "
            "Call that tool now with complete, valid arguments."
        ),
        messages=state["messages"],
        tools=selected_tools,
        tool_choice={"type": "function", "function": {"name": selected_tool}},
    ):
        if event["type"] == "text":
            final_text += str(event["delta"])
            writer(event)
        elif event["type"] == "reasoning":
            final_reasoning += str(event["delta"])
            writer(event)
        elif event["type"] == "tool-call":
            calls.append(event)

    tool_parts: list[dict[str, Any]] = []
    call = calls[0] if calls else None
    if call is None:
        definition = TOOL_BY_NAME[selected_tool]
        try:
            arguments = extract_json(
                await client.complete(
                    system=(
                        f"{state['system']}\nThe provider did not emit the required "
                        f"{selected_tool} tool call. Return only the JSON arguments for that tool, "
                        "with no wrapper, commentary, or markdown. The arguments must satisfy this "
                        f"schema: {json.dumps(definition.input_schema, ensure_ascii=False)}"
                    ),
                    messages=state["messages"],
                    json_mode=True,
                    max_tokens=8192,
                )
            )
            call = {
                "type": "tool-call",
                "id": f"fallback-{selected_tool}",
                "name": selected_tool,
                "arguments": arguments,
            }
        except (ValueError, TypeError, KeyError):
            call = None
    if call:
        tool = selected_tools[0]
        try:
            output = await tool.ainvoke(call["arguments"])
        except Exception:  # provider arguments can fail LangChain schema validation
            output = {"success": False, "error": "模型生成的修改参数无效，请重新发送一次修改要求。"}
        if output.get("success") is False:
            if not final_text:
                final_text = str(output.get("error") or "我没能生成有效的简历修改方案。")
                writer({"type": "text", "delta": final_text})
        else:
            if not final_text:
                final_text = ("正在根据你的个人资料库生成优势分析报告。" if selected_tool == "analyzeStudentStrengths" else "我已生成一份可审阅的修改方案，请在下方查看并决定是否应用。")
                writer({"type": "text", "delta": final_text})
            tool_parts.append(
                {"toolName": call["name"], "args": call["arguments"], "result": output}
            )
            writer({"type": "tool-result", "call": call, "output": output})
    elif not final_text:
        final_text = "我没能生成有效的简历修改方案，请重新发送一次修改要求。"
        writer({"type": "text", "delta": final_text})
    return {
        "final_text": final_text,
        "final_reasoning": final_reasoning,
        "tool_parts": tool_parts,
    }


_resume_chat_builder = StateGraph(ResumeChatState)
_resume_chat_builder.add_node("acknowledge_event", _acknowledge_workflow_event)
_resume_chat_builder.add_node("select_tool", _select_resume_tool)
_resume_chat_builder.add_node("invoke_tool", _invoke_resume_tool)
_resume_chat_builder.add_node("done", lambda _state: {})
_resume_chat_builder.add_conditional_edges(
    START,
    _route_resume_chat,
    {"acknowledge_event": "acknowledge_event", "select_tool": "select_tool"},
)
_resume_chat_builder.add_edge("acknowledge_event", END)
_resume_chat_builder.add_conditional_edges(
    "select_tool",
    _route_after_selection,
    {"invoke_tool": "invoke_tool", "done": "done"},
)
_resume_chat_builder.add_edge("invoke_tool", END)
_resume_chat_builder.add_edge("done", END)
RESUME_CHAT_GRAPH = _resume_chat_builder.compile(name="resume-chat-tools")


async def stream_resume_chat(
    client: AIClient,
    *,
    system: str,
    messages: list[dict[str, Any]],
    resume: dict[str, Any] | None,
    profile: dict[str, Any] | None = None,
    profile_version: int = 0,
    workflow_event: dict[str, Any] | None = None,
) -> AsyncIterator[tuple[str, Any]]:
    async for event in RESUME_CHAT_GRAPH.astream(
        {
            "client": client,
            "system": system,
            "messages": messages,
            "resume": resume,
            "profile": profile or {},
            "profile_version": profile_version,
            "workflow_event": workflow_event,
            "final_text": "",
            "final_reasoning": "",
            "tool_parts": [],
        },
        stream_mode=["custom", "values"],
    ):
        yield event
