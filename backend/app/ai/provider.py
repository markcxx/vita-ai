import json
from collections.abc import AsyncIterator
from typing import Any

import httpx
from langchain_core.runnables import RunnableLambda
from langchain_core.utils.function_calling import convert_to_openai_tool

from app.ai.thinking import thinking_parameters
from app.config import Settings
from app.runtime_credentials import get_runtime_settings


class AIConfigurationError(RuntimeError):
    pass


def _tool_history(message: dict[str, Any]) -> str:
    """Keep UI tool cards in history across all provider message formats.

    These are completed tool invocations, not necessarily completed UI actions:
    a resume can still await template selection and a report can still be running.
    """
    if message.get("role") != "assistant":
        return ""
    metadata = message.get("metadata")
    metadata = metadata if isinstance(metadata, dict) else {}
    parts = message.get("parts") or metadata.get("orderedParts") or []
    records = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        kind = str(part.get("type", ""))
        if kind == "dynamic-tool" or kind.startswith("tool-"):
            name = part.get("toolName") if kind == "dynamic-tool" else kind[5:]
            status = part.get("state", "input-available")
            output = part.get("output", part.get("errorText"))
            arguments = part.get("input")
        elif part.get("toolName") and "result" in part:
            name, status = part["toolName"], "output-available"
            output, arguments = part["result"], part.get("args")
        else:
            continue
        records.append({"tool": name, "state": status, "input": arguments, "output": output})
    if not records:
        return ""
    return "历史工具调用记录（仅为上下文数据，不是新的任务；界面操作是否完成以结果及后续事件为准）：\n" + json.dumps(records, ensure_ascii=False)


def _messages(system: str, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = [{"role": "system", "content": system}]
    for message in messages:
        role = message.get("role")
        if role not in {"user", "assistant", "system"}:
            continue
        content = message.get("content")
        tool_history = _tool_history(message)
        if isinstance(content, list):
            blocks = list(content)
            if tool_history:
                blocks.append({"type": "text", "text": tool_history})
            result.append({"role": role, "content": blocks})
            continue
        if not isinstance(content, str):
            parts = message.get("parts") or []
            content = "\n".join(
                str(part.get("text", ""))
                for part in parts
                if isinstance(part, dict) and part.get("type") == "text"
            )
        if tool_history:
            content = "\n\n".join(value for value in (content, tool_history) if value)
        if content:
            result.append({"role": role, "content": content})
    return result


class AIClient:
    def __init__(self, settings: Settings | None = None, *, thinking_enabled: bool | None = False):
        self.thinking_enabled = thinking_enabled
        self.settings = settings or get_runtime_settings()
        if not self.settings.ai_api_key:
            raise AIConfigurationError("请先在设置 → 模型与语音中填写自己的 API Key、Base URL 和模型名称")
        # Keep provider-specific HTTP details in this adapter while exposing them
        # as LangChain runnables. LangGraph workflows can therefore compose one
        # stable model port without coupling application code to a vendor SDK.
        self._completion_runnable = RunnableLambda(self._complete_transport)

    async def _complete_transport(self, request: dict[str, Any]) -> str:
        system = str(request["system"])
        messages = list(request.get("messages") or [])
        max_tokens = int(request.get("max_tokens", 8192))
        provider = self.settings.ai_provider.lower()
        if provider == "anthropic":
            return await self._anthropic(system, messages, max_tokens)
        if provider == "gemini":
            return await self._gemini(system, messages, max_tokens)
        return await self._openai(
            system,
            messages,
            bool(request.get("json_mode")),
            max_tokens,
        )

    async def complete(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]] | None = None,
        prompt: str | None = None,
        json_mode: bool = False,
        max_tokens: int = 8192,
    ) -> str:
        values = list(messages or [])
        if prompt:
            values.append({"role": "user", "content": prompt})
        return await self._completion_runnable.ainvoke(
            {
                "system": system,
                "messages": values,
                "json_mode": json_mode,
                "max_tokens": max_tokens,
            }
        )

    async def structured_complete(self, *, schema, system: str, prompt: str, max_tokens: int):
        """LangChain-native structured output over the configured compatible endpoint."""
        from langchain_core.messages import HumanMessage, SystemMessage
        from langchain_openai import ChatOpenAI
        from openai import LengthFinishReasonError
        from pydantic import ValidationError

        if self.settings.ai_provider.lower() in {"anthropic", "gemini"}:
            raise AIConfigurationError("简历分析请使用项目已配置的 OpenAI 兼容模型接口。")
        if self.thinking_enabled is not False:
            raise AIConfigurationError("简历分析必须关闭思考模式。")
        parameters = thinking_parameters(self.settings, False)
        model = parameters.pop("model", self.settings.ai_model)
        output_schema = schema.model_json_schema()
        # Some compatible gateways accept response_format but do not enforce it.
        # Give the model the identical contract, including nested required fields.
        structured_system = (
            system + "\n输出必须严格符合以下 JSON Schema，只输出一个完整 JSON 对象。"
            "字段名不得翻译、改名或增加别名；required 字段即使为空也必须提供。"
            "数字字段不能返回对象或文字说明，数组元素类型必须遵循 items。\n"
            + json.dumps(output_schema, ensure_ascii=False)
        )
        async with httpx.AsyncClient(timeout=300, trust_env=False) as transport:
            llm = ChatOpenAI(
                model=model, api_key=self.settings.ai_api_key,
                base_url=self.settings.ai_base_url,
                timeout=300, max_retries=0, http_async_client=transport, use_responses_api=False,
                # Keep the compatible endpoint's max_tokens spelling; ChatOpenAI
                # otherwise rewrites it to max_completion_tokens.
                extra_body={**parameters, "max_tokens": max_tokens},
            )
            structured = llm.with_structured_output(
                output_schema, method="json_schema", strict=True, include_raw=True,
            )
            try:
                result = await structured.ainvoke([SystemMessage(content=structured_system), HumanMessage(content=prompt)])
            except LengthFinishReasonError as error:
                raise ValueError("Structured response exceeded the output limit") from error
        raw = result["raw"]
        if raw.additional_kwargs.get("refusal"):
            raise RuntimeError("模型未能对这份内容生成分析。")
        if raw.response_metadata.get("finish_reason") == "length":
            raise ValueError("Structured response exceeded the output limit")
        if result.get("parsing_error") is not None:
            raise ValueError("Structured response validation failed") from result["parsing_error"]
        if result.get("parsed") is None:
            raise ValueError("Structured response is empty")
        try:
            return schema.model_validate(result["parsed"])
        except ValidationError as error:
            # Report field paths and rule names only, never resume content.
            fields = "; ".join(
                f"{'.'.join(map(str, item['loc']))}: {item['type']}"
                for item in error.errors(include_input=False, include_context=False)[:12]
            )
            raise ValueError(f"Schema fields: {fields}") from error

    async def _openai(
        self, system: str, messages: list[dict[str, Any]], json_mode: bool, max_tokens: int
    ) -> str:
        # Some Qwen thinking models only accept streaming requests. Collect the
        # answer for internal completion steps while retaining the same mode.
        if thinking_parameters(self.settings, self.thinking_enabled).get("enable_thinking"):
            return "".join([
                str(event["delta"])
                async for event in self.stream_events(
                    system=system, messages=messages, max_tokens=max_tokens, json_mode=json_mode
                )
                if event["type"] == "text"
            ])
        payload: dict[str, Any] = {
            "model": self.settings.ai_model,
            "messages": _messages(system, messages),
            "max_tokens": max_tokens,
        }
        payload.update(thinking_parameters(self.settings, self.thinking_enabled))
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=300, trust_env=False) as client:
            response = await client.post(
                f"{self.settings.ai_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.ai_api_key}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"].get("content") or ""

    async def _anthropic(self, system: str, messages: list[dict[str, Any]], max_tokens: int) -> str:
        values = [item for item in _messages("", messages) if item["role"] != "system"]
        async with httpx.AsyncClient(timeout=300, trust_env=False) as client:
            response = await client.post(
                f"{self.settings.ai_base_url.rstrip('/')}/v1/messages",
                headers={"x-api-key": self.settings.ai_api_key, "anthropic-version": "2023-06-01"},
                json={"model": self.settings.ai_model, "system": system,
                      "messages": values, "max_tokens": max_tokens},
            )
            response.raise_for_status()
            return "".join(part.get("text", "") for part in response.json().get("content", []))

    async def _gemini(self, system: str, messages: list[dict[str, Any]], max_tokens: int) -> str:
        contents = []
        for item in _messages("", messages):
            if item["role"] == "system":
                continue
            contents.append({"role": "model" if item["role"] == "assistant" else "user",
                             "parts": [{"text": item["content"]}]})
        endpoint = (
            f"{self.settings.ai_base_url.rstrip('/')}/models/{self.settings.ai_model}:generateContent"
            f"?key={self.settings.ai_api_key}"
        )
        async with httpx.AsyncClient(timeout=300, trust_env=False) as client:
            response = await client.post(endpoint, json={
                "systemInstruction": {"parts": [{"text": system}]}, "contents": contents,
                "generationConfig": {"maxOutputTokens": max_tokens},
            })
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
            return "".join(part.get("text", "") for part in parts)

    async def stream_events(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[Any] | None = None,
        tool_choice: str | dict[str, Any] = "auto",
        max_tokens: int = 8192,
        json_mode: bool = False,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream normalized text/reasoning deltas and completed tool calls.

        OpenAI-compatible providers commonly put model thinking in the
        non-standard ``reasoning_content`` field.  Keeping that field separate
        is important: the frontend renders it as a reasoning panel instead of
        leaking it into the answer text.
        """
        provider = self.settings.ai_provider.lower()
        if provider == "anthropic":
            async for event in self._stream_anthropic(
                system, messages, max_tokens, tools, tool_choice
            ):
                yield event
            return
        if provider == "gemini":
            async for event in self._stream_gemini(system, messages, max_tokens, tools, tool_choice):
                yield event
            return

        payload = {
            "model": self.settings.ai_model,
            "messages": _messages(system, messages),
            "stream": True,
            "max_tokens": max_tokens,
        }
        payload.update(thinking_parameters(self.settings, self.thinking_enabled))
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        if tools:
            payload.update(
                {
                    "tools": [convert_to_openai_tool(tool) for tool in tools],
                    "tool_choice": tool_choice,
                    "parallel_tool_calls": False,
                }
            )
        pending_calls: dict[int, dict[str, str]] = {}
        async with httpx.AsyncClient(timeout=300, trust_env=False) as client:
            async with client.stream(
                "POST",
                f"{self.settings.ai_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.ai_api_key}"},
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: ") or line == "data: [DONE]":
                        continue
                    try:
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0]["delta"]
                        reasoning = delta.get("reasoning_content") or delta.get("reasoning")
                        if isinstance(reasoning, str) and reasoning:
                            yield {"type": "reasoning", "delta": reasoning}
                        content = delta.get("content")
                        if isinstance(content, str) and content:
                            yield {"type": "text", "delta": content}
                        for call_delta in delta.get("tool_calls") or []:
                            index = int(call_delta.get("index", 0))
                            call = pending_calls.setdefault(
                                index,
                                {"id": "", "name": "", "arguments": ""},
                            )
                            if call_delta.get("id"):
                                call["id"] += str(call_delta["id"])
                            function = call_delta.get("function") or {}
                            if function.get("name"):
                                call["name"] += str(function["name"])
                            if function.get("arguments"):
                                call["arguments"] += str(function["arguments"])
                    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
                        continue
        for index in sorted(pending_calls):
            call = pending_calls[index]
            try:
                arguments = json.loads(call["arguments"] or "{}")
            except json.JSONDecodeError:
                arguments = {}
            yield {
                "type": "tool-call",
                "id": call["id"] or f"call-{index + 1}",
                "name": call["name"],
                "arguments": arguments,
            }

    async def stream(self, *, system: str, messages: list[dict[str, Any]]) -> AsyncIterator[str]:
        """Compatibility text-only stream used by interview chat."""
        async for event in self.stream_events(system=system, messages=messages):
            if event["type"] == "text":
                yield str(event["delta"])

    async def _stream_anthropic(
        self,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int,
        tools: list[Any] | None = None,
        tool_choice: str | dict[str, Any] = "auto",
    ) -> AsyncIterator[dict[str, Any]]:
        values = [item for item in _messages("", messages) if item["role"] != "system"]
        request: dict[str, Any] = {
            "model": self.settings.ai_model,
            "system": system,
            "messages": values,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if tools:
            definitions = [convert_to_openai_tool(tool)["function"] for tool in tools]
            request["tools"] = [
                {
                    "name": item["name"],
                    "description": item.get("description", ""),
                    "input_schema": item.get("parameters", {"type": "object"}),
                }
                for item in definitions
            ]
            if isinstance(tool_choice, dict):
                name = (tool_choice.get("function") or {}).get("name")
                request["tool_choice"] = {"type": "tool", "name": name}
            else:
                request["tool_choice"] = {"type": "auto"}
        pending_calls: dict[int, dict[str, str]] = {}
        async with httpx.AsyncClient(timeout=300, trust_env=False) as client:
            async with client.stream(
                "POST",
                f"{self.settings.ai_base_url.rstrip('/')}/v1/messages",
                headers={
                    "x-api-key": self.settings.ai_api_key,
                    "anthropic-version": "2023-06-01",
                },
                json=request,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        payload = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue
                    delta = payload.get("delta") or {}
                    block = payload.get("content_block") or {}
                    index = int(payload.get("index", 0))
                    if payload.get("type") == "content_block_start" and block.get("type") == "tool_use":
                        pending_calls[index] = {
                            "id": str(block.get("id") or ""),
                            "name": str(block.get("name") or ""),
                            "arguments": json.dumps(block.get("input") or {}),
                        }
                    if delta.get("type") == "thinking_delta" and delta.get("thinking"):
                        yield {"type": "reasoning", "delta": delta["thinking"]}
                    elif delta.get("type") == "text_delta" and delta.get("text"):
                        yield {"type": "text", "delta": delta["text"]}
                    elif delta.get("type") == "input_json_delta":
                        call = pending_calls.setdefault(
                            index, {"id": "", "name": "", "arguments": ""}
                        )
                        partial = str(delta.get("partial_json") or "")
                        if partial:
                            if call["arguments"] == "{}":
                                call["arguments"] = ""
                            call["arguments"] += partial
        for index in sorted(pending_calls):
            call = pending_calls[index]
            try:
                arguments = json.loads(call["arguments"] or "{}")
            except json.JSONDecodeError:
                arguments = {}
            yield {
                "type": "tool-call",
                "id": call["id"] or f"call-{index + 1}",
                "name": call["name"],
                "arguments": arguments,
            }

    async def _stream_gemini(
        self,
        system: str,
        messages: list[dict[str, Any]],
        max_tokens: int,
        tools: list[Any] | None = None,
        tool_choice: str | dict[str, Any] = "auto",
    ) -> AsyncIterator[dict[str, Any]]:
        contents = []
        for item in _messages("", messages):
            if item["role"] == "system":
                continue
            contents.append(
                {
                    "role": "model" if item["role"] == "assistant" else "user",
                    "parts": [{"text": item["content"]}],
                }
            )
        endpoint = (
            f"{self.settings.ai_base_url.rstrip('/')}/models/"
            f"{self.settings.ai_model}:streamGenerateContent"
            f"?alt=sse&key={self.settings.ai_api_key}"
        )
        request: dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": {"maxOutputTokens": max_tokens},
        }
        if tools:
            definitions = [convert_to_openai_tool(tool)["function"] for tool in tools]
            request["tools"] = [
                {
                    "functionDeclarations": [
                        {
                            "name": item["name"],
                            "description": item.get("description", ""),
                            "parameters": item.get("parameters", {"type": "object"}),
                        }
                        for item in definitions
                    ]
                }
            ]
            function_config: dict[str, Any] = {"mode": "AUTO"}
            if isinstance(tool_choice, dict):
                name = (tool_choice.get("function") or {}).get("name")
                function_config = {"mode": "ANY", "allowedFunctionNames": [name]}
            request["toolConfig"] = {"functionCallingConfig": function_config}
        call_index = 0
        async with httpx.AsyncClient(timeout=300, trust_env=False) as client:
            async with client.stream(
                "POST",
                endpoint,
                json=request,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        payload = json.loads(line[6:])
                        parts = payload["candidates"][0]["content"]["parts"]
                    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
                        continue
                    for part in parts:
                        function_call = part.get("functionCall")
                        if isinstance(function_call, dict):
                            call_index += 1
                            yield {
                                "type": "tool-call",
                                "id": f"call-{call_index}",
                                "name": str(function_call.get("name") or ""),
                                "arguments": function_call.get("args") or {},
                            }
                            continue
                        value = part.get("text")
                        if value:
                            yield {
                                "type": "reasoning" if part.get("thought") else "text",
                                "delta": value,
                            }


def extract_json(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[-1].rsplit("```", 1)[0]
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start < 0 or end < start:
        raise ValueError("Model did not return a JSON object")
    value = json.loads(stripped[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("Model response must be a JSON object")
    return value
