from app.core.config import Settings


def test_text_embedding_credentials_are_separate_from_chat(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "synthetic-chat-secret")
    monkeypatch.setenv("DASHSCOPE_BASE_URL", "https://chat.example.test/v1")
    monkeypatch.setenv("TEXT_EMBEDDING_API_KEY", "synthetic-vector-secret")
    monkeypatch.setenv("TEXT_EMBEDDING_BASE_URL", "https://api.siliconflow.cn/v1")
    settings = Settings(_env_file=None)
    assert settings.text_embedding_api_key == "synthetic-vector-secret"
    assert settings.text_embedding_base_url == "https://api.siliconflow.cn/v1"
    assert settings.text_embedding_provider == "siliconflow"
    assert settings.text_embedding_model == "BAAI/bge-m3"
    assert settings.text_embedding_dimension == 1024
    assert settings.dashscope_api_key == "synthetic-chat-secret"
    assert settings.dashscope_base_url == "https://chat.example.test/v1"
    assert "synthetic-vector-secret" not in repr(settings)


def test_missing_vector_key_does_not_reuse_chat_key(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "synthetic-chat-secret")
    monkeypatch.delenv("TEXT_EMBEDDING_API_KEY", raising=False)
    settings = Settings(_env_file=None)
    assert settings.text_embedding_api_key == ""
