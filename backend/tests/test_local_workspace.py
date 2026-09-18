"""Authentication preserves existing resource ownership and removed features stay absent."""
from datetime import UTC, datetime

import httpx
import pytest
from fastapi import HTTPException

from app.api.dependencies import workspace_owner
from app.db.models import User
from app.main import app
from app.services.resumes import owned_resume

LOCAL_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_removed_routes_are_absent_and_health_is_public():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get('/api/v1/health/live')).status_code == 200
        schema = (await client.get('/api/v1/openapi.json')).json()
        assert not schema.get('components', {}).get('securitySchemes')
        assert not any('auth' in path or 'career-cases' in path or 'linkedin-photo' in path for path in schema['paths'])
        for path in ['/api/auth/config', '/api/auth/session', '/api/career-cases']:
            assert (await client.get(path)).status_code == 404
        for path in ['/api/auth/login', '/api/auth/logout', '/api/auth/sso', '/api/auth/sms/code', '/api/auth/sms/login', '/api/linkedin-photo']:
            assert (await client.post(path, json={})).status_code == 404


@pytest.mark.anyio
async def test_workspace_dependency_uses_verified_session_owner():
    owner = User(id=LOCAL_WORKSPACE_ID, name='Local', is_active=True, created_at=datetime.now(UTC))

    class Session:
        async def get(self, model, key):
            assert model is User
            assert key == LOCAL_WORKSPACE_ID
            return owner

    assert await workspace_owner(Session(), {"id": LOCAL_WORKSPACE_ID}) is owner


@pytest.mark.anyio
async def test_resource_ownership_check_is_preserved(monkeypatch):
    from types import SimpleNamespace

    from app.services import resumes

    async def get_resume(session, resume_id):
        return SimpleNamespace(id=resume_id, user_id='another-owner')

    monkeypatch.setattr(resumes, 'get_resume', get_resume)
    with pytest.raises(HTTPException) as error:
        await owned_resume(None, User(id=LOCAL_WORKSPACE_ID), 'resume-id')
    assert error.value.status_code == 404


@pytest.mark.anyio
async def test_private_apis_reject_missing_cookie_and_spoofed_identity():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        for path in ['/api/resume', '/api/user/settings', '/api/ai/config', '/api/interview']:
            assert (await client.get(path, headers={'x-user-id': LOCAL_WORKSPACE_ID})).status_code == 401
