import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import get_actor, require_admin
from app.domain.contracts import Actor
from app.domain.enums import Role
from app.modules.identity.models import SessionToken, User
from app.modules.identity.service import (
    authenticate_user,
    credential_digest,
    find_user,
    hash_password,
    user_info,
)

router = APIRouter(prefix="/api/v1")


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")
    password: str = Field(min_length=8, max_length=256, repr=False)


class UserCreate(LoginRequest):
    role: Role = Role.VIEWER


@router.post("/auth/login")
def login(
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    user = authenticate_user(db, body.username, body.password)
    if user is None:
        raise AppError("INVALID_CREDENTIALS", "用户名或密码错误", 401)
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    db.add(
        SessionToken(
            user_id=user.id,
            token_digest=credential_digest(token, settings.session_secret),
            csrf_digest=credential_digest(csrf, settings.session_secret),
            expires_at=datetime.now(UTC) + timedelta(hours=settings.session_hours),
        )
    )
    db.commit()
    cookie = {
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
        "max_age": settings.session_hours * 3600,
    }
    response.set_cookie("atlas_session", token, httponly=True, **cookie)
    response.set_cookie("atlas_csrf", csrf, httponly=False, **cookie)
    response.headers["Cache-Control"] = "no-store"
    return {"user": user_info(user), "csrf_token": csrf}


@router.get("/auth/me")
def me(actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return user_info(find_user(db, actor, actor.user_id))


@router.post("/auth/logout", status_code=204)
def logout(request: Request, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    db.execute(delete(SessionToken).where(SessionToken.id == request.state.session_id))
    db.commit()
    response = Response(status_code=204)
    response.delete_cookie("atlas_session", path="/")
    response.delete_cookie("atlas_csrf", path="/")
    return response


@router.get("/identity/users")
def list_users(actor: Actor = Depends(require_admin), db: Session = Depends(get_db)):
    return [
        user_info(row)
        for row in db.scalars(
            select(User).where(User.workspace_id == actor.workspace_id).order_by(User.username)
        )
    ]


@router.get("/identity/users/{user_id}")
def get_user(user_id: UUID, actor: Actor = Depends(require_admin), db: Session = Depends(get_db)):
    return user_info(find_user(db, actor, user_id))


@router.post("/identity/users", status_code=201)
def create_user(
    body: UserCreate, actor: Actor = Depends(require_admin), db: Session = Depends(get_db)
):
    user = User(
        workspace_id=actor.workspace_id,
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role.value,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError("USERNAME_TAKEN", "用户名已存在", 409) from None
    return user_info(user)
