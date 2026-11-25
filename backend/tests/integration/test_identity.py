from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.modules.identity.models import SessionToken, User


def test_anonymous_rejected(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/identity/users").status_code == 401


def test_login_cookie_and_logout(client, login):
    csrf = login()
    assert client.get("/api/v1/auth/me").json()["role"] == "admin"
    assert client.cookies.get("atlas_session")
    assert client.post("/api/v1/auth/logout", headers=csrf).status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401


def test_cookie_csrf_required(client, login):
    login()
    assert client.post("/api/v1/auth/logout").status_code == 403
    assert (
        client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "incorrect"}).status_code == 403
    )


def test_viewer_cannot_manage_users(client, login):
    csrf = login("viewer-a")
    assert client.get("/api/v1/identity/users").status_code == 403
    assert (
        client.post(
            "/api/v1/identity/users",
            headers=csrf,
            json={"username": "illegal", "password": "synthetic-password", "role": "admin"},
        ).status_code
        == 403
    )


def test_cross_workspace_rejected(client, login, sessions):
    login()
    with sessions() as db:
        foreign = db.scalar(select(User).where(User.username == "admin-b"))
        foreign_id = str(foreign.id)
    assert client.get(f"/api/v1/identity/users/{foreign_id}").status_code == 404
    names = {u["username"] for u in client.get("/api/v1/identity/users").json()}
    assert names == {"admin-a", "viewer-a"}


def test_expired_session_and_bad_credentials(client, login, sessions):
    assert (
        client.post(
            "/api/v1/auth/login", json={"username": "admin-a", "password": "incorrect-password"}
        ).status_code
        == 401
    )
    login()
    with sessions() as db:
        for row in db.scalars(select(SessionToken)):
            row.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_validation_does_not_echo_password(client):
    r = client.post("/api/v1/auth/login", json={"username": "admin-a", "password": "p#7-Q!"})
    assert r.status_code == 422
    assert "p#7-Q!" not in r.text
    assert all("input" not in item for item in r.json()["details"])


def test_unknown_username_still_performs_password_verification(client, monkeypatch):
    from app.modules.identity import router as auth_router
    from app.modules.identity import service

    calls = []
    verify = service.verify_password

    def spy(password, encoded):
        calls.append(True)
        return verify(password, encoded)

    monkeypatch.setattr(service, "verify_password", spy)
    monkeypatch.setattr(auth_router, "verify_password", spy, raising=False)
    for username in ("unknown-user", "admin-a"):
        assert (
            client.post(
                "/api/v1/auth/login", json={"username": username, "password": "incorrect-password"}
            ).status_code
            == 401
        )
    assert len(calls) == 2
