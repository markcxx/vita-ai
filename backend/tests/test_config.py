import pytest

from app.config import Settings


def test_dotenv_values_and_process_precedence(tmp_path, monkeypatch):
    for name in ("APP_AI_MODEL", "AI_MODEL", "APP_NAME", "APP_APP_NAME", "APP_DATABASE_URL", "DATABASE_URL"):
        monkeypatch.delenv(name, raising=False)
    file = tmp_path / ".env"
    file.write_text("APP_NAME='本地应用'\nAI_MODEL='file-model'\nDATABASE_URL='postgresql://user:pass@localhost/example'\n")
    monkeypatch.setenv("AI_MODEL", "process-model")
    settings = Settings(_env_file=file)
    assert settings.app_name == "本地应用"
    assert settings.ai_model == "process-model"
    assert settings.database_url == "postgresql+psycopg://user:pass@localhost/example"


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_postgres_driver_normalization(scheme):
    settings = Settings(_env_file=None, database_url=f"{scheme}://user:pass@localhost/db?sslmode=require")
    assert settings.database_url == "postgresql+psycopg://user:pass@localhost/db?sslmode=require"
