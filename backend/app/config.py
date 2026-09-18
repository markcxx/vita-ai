from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, AliasGenerator, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


def environment_alias(name: str) -> AliasChoices:
    if name == "app_name":
        return AliasChoices("APP_NAME", "APP_APP_NAME")
    if name == "name":
        return AliasChoices("API_NAME", "APP_API_NAME")
    return AliasChoices(f"APP_{name.upper()}", name.upper())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        alias_generator=AliasGenerator(validation_alias=environment_alias),
        populate_by_name=True,
        extra="ignore",
    )

    name: str = "LT Employ Assistant API"
    version: str = "0.1.0"
    env: str = "development"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    database_url: str = ""
    public_base_url: str = "http://localhost:3000"
    auth_server_url: str = "http://127.0.0.1:3000"
    app_url: str = "http://localhost:3000"
    app_name: str = "VitaAI"
    ai_provider: str = "openai"
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o"
    ai_thinking_mode: Literal["auto", "thinking", "enable_thinking", "deepseek_legacy", "always", "unsupported"] = "auto"
    dashscope_api_key: str = ""
    dashscope_workspace_id: str = ""
    dashscope_websocket_url: str = ""
    dashscope_tts_model: str = "qwen-audio-3.0-tts-flash"
    dashscope_tts_voice: str = ""


    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        for prefix in ("postgresql://", "postgres://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
