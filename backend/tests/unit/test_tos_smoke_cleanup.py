import importlib.util
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace


def test_smoke_deletes_only_the_version_it_created(tmp_path, monkeypatch):
    path = Path(__file__).resolve().parents[3] / "scripts/smoke_tos.py"
    spec = importlib.util.spec_from_file_location("tos_smoke_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    (tmp_path / ".env").write_text(
        "TOS_ACCESS_KEY=synthetic-key\nTOS_SECRET_KEY=synthetic-secret\nTOS_REGION=cn-beijing\nTOS_ENDPOINT=https://tos-cn-beijing.volces.com\nTOS_BUCKET=media-atlas-1151014007\nTOS_PREFIX=media-atlas/development/\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(module, "ROOT", tmp_path)
    monkeypatch.setattr(module, "REPORT", tmp_path / ".local/report.json")

    class Missing(Exception):
        code = "NoSuchKey"
        status_code = 404

    class Client:
        body = b""
        deleted = False
        removed_version = None

        def put_object(self, *args, **kwargs):
            self.body = kwargs["content"]
            return SimpleNamespace(status_code=200, version_id="only-owned-version")

        def get_object(self, *args, **kwargs):
            if self.deleted:
                raise Missing()
            return BytesIO(self.body)

        def pre_signed_url(self, *args, **kwargs):
            return SimpleNamespace(
                signed_url="https://media-atlas-1151014007.tos-cn-beijing.volces.com/test"
            )

        def delete_object(self, *args, **kwargs):
            self.deleted = True
            self.removed_version = kwargs.get("version_id")
            return SimpleNamespace(status_code=204)

        def close(self):
            pass

    client = Client()
    monkeypatch.setattr(module.tos, "TosClientV2", lambda *args, **kwargs: client)
    monkeypatch.setattr(module.tos.exceptions, "TosServerError", Missing)

    class Http:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url):
            return SimpleNamespace(status_code=200, content=client.body)

    monkeypatch.setattr(module.httpx, "Client", Http)
    assert module.main() == 0
    assert client.removed_version == "only-owned-version"
