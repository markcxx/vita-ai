import asyncio

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.runtime_credentials import RuntimeCredentialsMiddleware, get_runtime_settings


@pytest.fixture
def anyio_backend():
    return 'asyncio'


@pytest.mark.anyio
@pytest.mark.parametrize('environment', ['development', 'production'])
async def test_credentials_are_request_scoped_and_server_fallback_disabled(monkeypatch, environment):
    settings = Settings(env=environment, ai_api_key='server-secret', dashscope_api_key='server-voice', _env_file=None)
    monkeypatch.setattr('app.runtime_credentials.get_settings', lambda: settings)
    async def valid_url(*_):
        pass
    monkeypatch.setattr('app.runtime_credentials.validate_base_url', valid_url)
    app = FastAPI()
    app.add_middleware(RuntimeCredentialsMiddleware)
    @app.get('/')
    async def probe():
        await asyncio.sleep(0.005)
        config = get_runtime_settings()
        return {'key': config.ai_api_key, 'voice': config.dashscope_api_key, 'url': config.ai_base_url}
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        a, b, empty = await asyncio.gather(*[
            client.get('/', headers={'x-ai-api-key': key, 'x-ai-base-url': 'https://example.com/v1', 'x-ai-model': 'model', 'x-voice-api-key': key})
            for key in ['alice', 'bob']
        ], client.get('/'))
        assert a.json()['key'] == a.json()['voice'] == 'alice'
        assert b.json()['key'] == b.json()['voice'] == 'bob'
        assert empty.json()['key'] == empty.json()['voice'] == ''
        invalid = await client.get('/', headers={'x-ai-api-key': 'secret'})
        assert invalid.status_code == 400
    assert get_runtime_settings().ai_api_key == ('server-secret' if environment == 'development' else '')
