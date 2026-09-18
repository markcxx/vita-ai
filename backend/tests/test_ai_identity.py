import pytest

from app.ai.prompts import build_resume_system_prompt
from app.config import Settings


@pytest.mark.parametrize("name", ["兰途就业助手", "新疆政法大学就业助手"])
def test_identity_comes_from_shared_app_name(monkeypatch, name):
    monkeypatch.setenv("APP_NAME", name)
    monkeypatch.delenv("APP_APP_NAME", raising=False)
    settings = Settings(_env_file=None)
    prompt = build_resume_system_prompt("", assistant_name=settings.app_name, can_generate_resume=True)
    assert settings.app_name == name
    assert f'Your configured display name is "{name}"' in prompt
    assert "for VitaAI" not in prompt
    assert "prepareTailoredResume" in prompt
    assert "previous deployment's name" in prompt
