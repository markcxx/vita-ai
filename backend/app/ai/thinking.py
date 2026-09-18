"""Thinking controls for OpenAI-compatible chat APIs.

Official references:
https://help.aliyun.com/zh/model-studio/deep-thinking
https://api-docs.deepseek.com/guides/thinking_mode
https://docs.bigmodel.cn/cn/guide/capabilities/thinking

Gateways may rename models or translate parameters. AI_THINKING_MODE provides
an explicit deployment override; unknown models keep their provider defaults.
"""
import re
from typing import Any

from app.config import Settings


def thinking_mode(settings: Settings) -> str:
    if settings.ai_provider.lower() in {"anthropic", "gemini"}:
        return "unsupported"
    if settings.ai_thinking_mode != "auto":
        return settings.ai_thinking_mode
    model = settings.ai_model.lower().rsplit("/", 1)[-1]
    if model in {"deepseek-chat", "deepseek-reasoner"}:
        return "deepseek_legacy"
    if re.match(r"deepseek-(?:v3[.-][12]|v4|flash|pro)(?:[-.]|$)", model):
        return "thinking"
    if "thinking" in model or "deepseek-r1" in model or model.startswith("glm-5.3"):
        return "always"
    if model.startswith("qwen3") and not any(x in model for x in ("instruct", "coder")):
        return "enable_thinking"
    if model in {"qwen-plus", "qwen-flash"}:
        return "enable_thinking"
    if re.match(r"glm-(?:4\.[567]|5(?:\.[12])?)(?:-|$)", model):
        return "thinking"
    return "unsupported"


def thinking_capability(settings: Settings) -> dict[str, Any]:
    mode = thinking_mode(settings)
    supported = mode not in {"unsupported", "always"}
    return {
        "supported": supported,
        "defaultEnabled": mode == "always",
        "reason": "" if supported else (
            "当前模型始终开启思考，不支持关闭" if mode == "always"
            else "当前模型尚未配置思考模式切换"
        ),
    }


def thinking_parameters(settings: Settings, enabled: bool | None) -> dict[str, Any]:
    if enabled is None:
        return {}
    mode = thinking_mode(settings)
    if mode == "enable_thinking":
        return {"enable_thinking": enabled}
    if mode == "thinking":
        return {"thinking": {"type": "enabled" if enabled else "disabled"}}
    if mode == "deepseek_legacy":
        return {"model": "deepseek-reasoner" if enabled else "deepseek-chat"}
    return {}
