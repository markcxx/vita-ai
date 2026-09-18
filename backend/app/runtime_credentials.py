"""Request-only provider credentials. Never persisted or shared between users."""
import asyncio
import ipaddress
import socket
from contextvars import ContextVar
from urllib.parse import urlsplit

from starlette.responses import JSONResponse

from app.config import Settings, get_settings

_runtime: ContextVar[Settings | None] = ContextVar('runtime_credentials', default=None)


def get_runtime_settings() -> Settings:
    value = _runtime.get()
    if value is not None:
        return value
    base = get_settings()
    return base if base.env == 'development' else base.model_copy(update={'ai_api_key': '', 'dashscope_api_key': ''})


async def validate_base_url(value: str, production: bool) -> None:
    parsed = urlsplit(value)
    if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('模型服务地址无效')
    if production:
        if parsed.scheme != 'https':
            raise ValueError('模型服务地址必须使用 HTTPS')
        addresses = await asyncio.get_running_loop().getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
            raise ValueError('模型服务地址必须是公网地址')


class RuntimeCredentialsMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        headers = {k.decode().lower(): v.decode() for k, v in scope.get('headers', [])}
        base = get_settings()
        production = base.env != 'development'
        # HTTP users always supply their own credentials, including local development.
        changes = {'ai_api_key': '', 'dashscope_api_key': ''}
        key = headers.get('x-ai-api-key', '').strip()
        try:
            if key:
                provider = headers.get('x-ai-provider', 'openai')
                if provider not in {'openai', 'anthropic', 'gemini'}:
                    raise ValueError('不支持的模型服务')
                url = headers.get('x-ai-base-url', '').strip()
                model = headers.get('x-ai-model', '').strip()
                if not url or not model:
                    raise ValueError('请填写模型服务地址和模型名称')
                await validate_base_url(url, production)
                changes.update(ai_api_key=key, ai_base_url=url.rstrip('/'), ai_provider=provider, ai_model=model)
            if voice_key := headers.get('x-voice-api-key', '').strip():
                changes['dashscope_api_key'] = voice_key
            if any(len(value) > 8192 for value in changes.values()):
                raise ValueError('模型配置过长')
        except (ValueError, OSError):
            return await JSONResponse({'detail': '模型配置无效，请检查模型服务、Base URL 和模型名称。'}, status_code=400)(scope, receive, send)
        token = _runtime.set(base.model_copy(update=changes))
        async def send_with_cookies(message):
            if message['type'] == 'http.response.start':
                # Also renew session cookies on streaming/file responses.
                extra = [(b'set-cookie', value.encode('latin1')) for value in scope.get('state', {}).get('auth_cookies', [])]
                message = {**message, 'headers': [*message.get('headers', []), *extra]}
            await send(message)
        try:
            await self.app(scope, receive, send_with_cookies)
        finally:
            _runtime.reset(token)
