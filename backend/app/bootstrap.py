import re

from sqlalchemy import select, text

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.modules.identity.models import User, Workspace
from app.modules.identity.service import hash_password


def validate_bootstrap_credentials(settings):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{2,63}", settings.bootstrap_admin_username):
        raise ValueError("Invalid initial administrator username")
    if not 12 <= len(settings.bootstrap_admin_password) <= 256:
        raise ValueError("Initial administrator password must contain 12 to 256 characters")


def main():
    settings = get_settings()
    settings.validate_runtime()
    try:
        validate_bootstrap_credentials(settings)
    except ValueError as error:
        raise SystemExit(str(error)) from None
    with get_session_factory()() as db, db.begin():
        db.execute(text("SELECT pg_advisory_xact_lock(7834243991)"))
        if db.scalar(select(User.id).limit(1)) is not None:
            print("Initialization already completed; no credentials or users changed.")
            return
        workspace = Workspace(name="映库工作区")
        db.add(workspace)
        db.flush()
        db.add(
            User(
                workspace_id=workspace.id,
                username=settings.bootstrap_admin_username,
                password_hash=hash_password(settings.bootstrap_admin_password),
                role="admin",
            )
        )
    print("Workspace and initial administrator created. Credentials remain in local .env.")


if __name__ == "__main__":
    main()
