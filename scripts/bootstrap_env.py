"""Initialize missing local settings while preserving existing credentials."""

import os
import secrets
from io import StringIO
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

from dotenv import dotenv_values


def initialize_env(root: Path) -> bool:
    destination = root / ".env"
    if destination.is_symlink():
        raise ValueError("Refusing to modify a symlinked .env")
    exists = destination.exists()
    original = destination.read_bytes() if exists else None
    content = (
        original.decode("utf-8-sig")
        if exists
        else (root / ".env.example").read_text(encoding="utf-8")
    )
    values = dict(dotenv_values(stream=StringIO(content), interpolate=False))
    password = values.get("POSTGRES_PASSWORD") or secrets.token_urlsafe(24)
    user = values.get("POSTGRES_USER") or "atlas"
    database = values.get("POSTGRES_DB") or "media_atlas"
    port = values.get("POSTGRES_PORT") or "15433"
    authority = f"{quote(user, safe='')}:{quote(password, safe='')}@127.0.0.1:{port}"
    defaults = {
        "POSTGRES_USER": user,
        "POSTGRES_DB": database,
        "POSTGRES_PORT": port,
        "POSTGRES_PASSWORD": password,
        "DATABASE_URL": f"postgresql+psycopg://{authority}/{quote(database, safe='')}",
        "TEST_DATABASE_URL": f"postgresql+psycopg://{authority}/media_atlas_test",
        "REDIS_URL": "redis://127.0.0.1:16380/0",
        "SESSION_SECRET": secrets.token_urlsafe(48),
        "BOOTSTRAP_ADMIN_USERNAME": "admin",
        "BOOTSTRAP_ADMIN_PASSWORD": secrets.token_urlsafe(18),
    }
    replacements = {key: value for key, value in defaults.items() if not values.get(key)}
    if exists and not replacements:
        if os.name != "nt":
            destination.chmod(0o600)
        return False
    seen = set()
    lines = []
    for line in content.splitlines():
        key = line.split("=", 1)[0].strip()
        if "=" in line and key in replacements:
            line = key + "=" + replacements[key]
            seen.add(key)
        lines.append(line)
    lines.extend(key + "=" + value for key, value in replacements.items() if key not in seen)
    target = root / (".env.init-" + uuid4().hex) if exists else destination
    if exists and destination.read_bytes() != original:
        raise ValueError("Configuration changed concurrently; initialization stopped")
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write("\n".join(lines) + "\n")
        if exists:
            if destination.read_bytes() != original:
                raise ValueError("Configuration changed concurrently; initialization stopped")
            os.replace(target, destination)
    finally:
        if exists and target.exists():
            target.unlink()
    return True


def main():
    changed = initialize_env(Path(__file__).resolve().parents[1])
    print(
        "Missing local settings initialized; existing credentials preserved."
        if changed
        else "Existing configuration preserved; no values changed."
    )


if __name__ == "__main__":
    main()
