import hmac
from datetime import UTC, datetime

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.domain.contracts import Actor
from app.domain.enums import Role
from app.modules.identity.models import SessionToken, User
from app.modules.identity.service import credential_digest, require_role


def get_actor(
    request: Request, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)
) -> Actor:
    token = request.cookies.get("atlas_session", "")
    if not token:
        raise AppError("UNAUTHENTICATED", "请先登录", 401)
    row = db.execute(
        select(SessionToken, User)
        .join(User, SessionToken.user_id == User.id)
        .where(
            SessionToken.token_digest == credential_digest(token, settings.session_secret),
            SessionToken.expires_at > datetime.now(UTC),
            User.active.is_(True),
        )
    ).first()
    if row is None:
        raise AppError("UNAUTHENTICATED", "登录状态已失效", 401)
    session, user = row
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        csrf = request.headers.get("X-CSRF-Token", "")
        if not csrf or not hmac.compare_digest(
            credential_digest(csrf, settings.session_secret), session.csrf_digest
        ):
            raise AppError("CSRF_INVALID", "请求校验失败，请刷新后重试", 403)
    request.state.session_id = session.id
    return Actor(user.workspace_id, user.id, Role(user.role))


def require_admin(actor: Actor = Depends(get_actor)) -> Actor:
    return require_role(actor, {Role.ADMIN})
