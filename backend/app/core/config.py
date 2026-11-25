from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    app_env: str = "development"
    database_url: str = Field(default="", repr=False)
    redis_url: str = Field(default="redis://127.0.0.1:16380/0", repr=False)
    session_secret: str = Field(default="", repr=False)
    bootstrap_admin_username: str = "admin"
    bootstrap_admin_password: str = Field(default="", repr=False)
    cookie_secure: bool = False
    session_hours: int = 8
    dashscope_api_key: str = Field(default="", repr=False)
    dashscope_region: str = "cn-beijing"
    dashscope_workspace_id: str = ""
    dashscope_base_url: str = ""
    text_embedding_provider: str = "siliconflow"
    text_embedding_api_key: str = Field(default="", repr=False)
    text_embedding_base_url: str = "https://api.siliconflow.cn/v1"
    text_embedding_model: str = "BAAI/bge-m3"
    text_embedding_dimension: int = 1024
    visual_embedding_model: str = "tongyi-embedding-vision-plus-2026-03-06"
    visual_embedding_dimension: int = 1152
    vision_model: str = "qwen3-vl-flash"
    asr_model: str = "qwen-audio-3.0-asr-flash"
    answer_model: str = "qwen3.7-plus"
    storage_backend: str = "tos"
    tos_access_key: str = Field(default="", repr=False)
    tos_secret_key: str = Field(default="", repr=False)
    tos_region: str = ""
    tos_endpoint: str = ""
    tos_bucket: str = ""
    tos_prefix: str = "media-atlas/development/"
    cloud_smoke_max_assets: int = 4
    cloud_bulk_enabled: bool = False

    def validate_runtime(self):
        if not self.database_url:
            raise ValueError("DATABASE_URL is required")
        if len(self.session_secret) < 32:
            raise ValueError("SESSION_SECRET must contain at least 32 characters")
        if self.app_env == "production" and not self.cookie_secure:
            raise ValueError("Production requires COOKIE_SECURE=true and HTTPS")
        if (self.text_embedding_dimension, self.visual_embedding_dimension) != (1024, 1152):
            raise ValueError("Changing embedding dimensions requires an explicit schema migration")


@lru_cache
def get_settings() -> Settings:
    return Settings()
