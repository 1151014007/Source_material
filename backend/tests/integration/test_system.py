def test_status_is_authenticated_and_does_not_include_credentials(client, login):
    assert client.get("/api/v1/system/integrations").status_code == 401
    login()
    r = client.get("/api/v1/system/integrations")
    assert r.status_code == 200
    assert {item["id"] for item in r.json()["integrations"]} == {
        "chat",
        "text_embedding",
        "asr",
        "tos",
        "vision",
        "visual_embedding",
    }
    assert all(
        "api_key" not in item and "secret_key" not in item for item in r.json()["integrations"]
    )


def test_viewer_cannot_read_workspace_integration_settings(client, login):
    login("viewer-a")
    assert client.get("/api/v1/system/integrations").status_code == 403


def test_malformed_probe_is_reported_without_breaking_other_integrations(
    client, login, tmp_path, monkeypatch
):
    from app.modules.system import router as system

    directory = tmp_path / ".local/reports"
    directory.mkdir(parents=True)
    (directory / "2026-11-25-chat-smoke-supported-model.json").write_text("null", encoding="utf-8")
    monkeypatch.setattr(system, "ROOT", tmp_path)
    login()
    response = client.get("/api/v1/system/integrations")
    assert response.status_code == 200
    items = response.json()["integrations"]
    assert len(items) == 6
    assert items[0]["historical_probe"]["passed"] is False


def test_tos_credentials_alone_are_not_complete_configuration():
    from uuid import uuid4

    from app.core.config import Settings
    from app.domain.contracts import Actor
    from app.domain.enums import Role
    from app.modules.system.router import integrations

    result = integrations(
        Actor(uuid4(), uuid4(), Role.ADMIN),
        Settings(_env_file=None, tos_access_key="synthetic-key", tos_secret_key="synthetic-secret"),
    )
    assert next(x for x in result["integrations"] if x["id"] == "tos")["configured"] is False
