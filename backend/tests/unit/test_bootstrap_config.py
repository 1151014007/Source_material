import importlib.util
import os
from pathlib import Path

import pytest
from dotenv import dotenv_values

from app.bootstrap import validate_bootstrap_credentials
from app.core.config import Settings


def load_bootstrap():
    path = Path(__file__).resolve().parents[3] / "scripts/bootstrap_env.py"
    spec = importlib.util.spec_from_file_location("bootstrap_env_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_env_created_owner_only_and_existing_cloud_values_survive(tmp_path, monkeypatch):
    module = load_bootstrap()
    (tmp_path / ".env.example").write_text(
        "POSTGRES_PASSWORD=\nSESSION_SECRET=\nBOOTSTRAP_ADMIN_PASSWORD=\n", encoding="utf-8"
    )
    modes = []
    real_open = os.open

    def spy(path, flags, mode=0o777, **kwargs):
        modes.append(mode)
        return real_open(path, flags, mode, **kwargs)

    monkeypatch.setattr(module.os, "open", spy)
    assert module.initialize_env(tmp_path)
    assert 0o600 in modes
    values = dict(dotenv_values(tmp_path / ".env"))
    assert values["POSTGRES_PASSWORD"] and len(values["SESSION_SECRET"]) >= 32
    assert not module.initialize_env(tmp_path)
    assert dict(dotenv_values(tmp_path / ".env")) == values


def test_existing_partial_template_preserves_cloud_credentials(tmp_path):
    module = load_bootstrap()
    path = tmp_path / ".env"
    path.write_text(
        "DASHSCOPE_API_KEY=synthetic-cloud-secret\nPOSTGRES_PASSWORD=\nSESSION_SECRET=\n",
        encoding="utf-8",
    )
    assert module.initialize_env(tmp_path)
    values = dotenv_values(path)
    assert values["DASHSCOPE_API_KEY"] == "synthetic-cloud-secret"
    assert values["POSTGRES_PASSWORD"] and values["DATABASE_URL"]
    assert values["TEST_DATABASE_URL"].endswith("/media_atlas_test")


@pytest.mark.parametrize("length", [11, 257])
def test_initial_password_matches_login_limits(length):
    with pytest.raises(ValueError):
        validate_bootstrap_credentials(
            Settings(_env_file=None, bootstrap_admin_password="x" * length)
        )


def test_initial_password_at_maximum_is_accepted():
    validate_bootstrap_credentials(Settings(_env_file=None, bootstrap_admin_password="x" * 256))
