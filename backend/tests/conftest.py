import os
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
import requests
from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import Settings
from app.core.database import Base, get_db, validate_test_database_url
from app.modules.identity.models import User, Workspace
from app.modules.identity.service import hash_password


@pytest.fixture(autouse=True)
def no_real_cloud(monkeypatch):
    def reject(*args, **kwargs):
        raise AssertionError("Real external HTTP is forbidden in automated tests")

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", reject)
    monkeypatch.setattr(requests.sessions.Session, "request", reject)


@pytest.fixture
def sessions():
    values = dotenv_values(Path(__file__).resolve().parents[2] / ".env")
    url = validate_test_database_url(
        os.environ.get("TEST_DATABASE_URL", values.get("TEST_DATABASE_URL", ""))
    )
    schema = "test_" + uuid4().hex
    admin = create_engine(url, poolclass=NullPool, hide_parameters=True)
    with admin.begin() as c:
        c.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(
        url,
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={"options": f"-csearch_path={schema},public"},
        execution_options={"schema_translate_map": {None: schema}},
    )
    try:
        Base.metadata.create_all(engine)
        yield sessionmaker(engine, expire_on_commit=False)
    finally:
        engine.dispose()
        with admin.begin() as c:
            c.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


@pytest.fixture
def client(sessions):
    from fastapi.testclient import TestClient

    from app.core.config import get_settings
    from app.main import create_app

    with sessions() as db:
        a, b = Workspace(name="Test A"), Workspace(name="Test B")
        db.add_all([a, b])
        db.flush()
        for name, role, workspace in [
            ("admin-a", "admin", a),
            ("viewer-a", "viewer", a),
            ("admin-b", "admin", b),
        ]:
            db.add(
                User(
                    username=name,
                    password_hash=hash_password("synthetic-password"),
                    role=role,
                    workspace_id=workspace.id,
                )
            )
        db.commit()
    app = create_app()

    def db_override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None,
        session_secret="synthetic-session-secret-long-enough-for-test-only",
        dashscope_api_key="",
        text_embedding_api_key="",
        tos_access_key="",
        tos_secret_key="",
    )
    c = TestClient(app)
    yield c
    c.close()


@pytest.fixture
def login(client):
    def perform(username="admin-a"):
        r = client.post(
            "/api/v1/auth/login", json={"username": username, "password": "synthetic-password"}
        )
        assert r.status_code == 200
        return {"X-CSRF-Token": r.json()["csrf_token"]}

    return perform
