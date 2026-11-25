import base64
import hashlib
import hmac
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.domain.contracts import Actor
from app.domain.enums import Role
from app.modules.identity.models import User


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt + digest).decode()


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, data = encoded.split("$", 1)
        raw = base64.b64decode(data, validate=True)
        if algorithm != "scrypt" or len(raw) != 48:
            return False
        digest = hashlib.scrypt(password.encode(), salt=raw[:16], n=16384, r=8, p=1, dklen=32)
        return hmac.compare_digest(digest, raw[16:])
    except (ValueError, TypeError):
        return False


def credential_digest(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


DUMMY_PASSWORD_HASH = hash_password("dummy-authentication-placeholder")


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.username == username, User.active.is_(True)))
    valid = verify_password(password, user.password_hash if user else DUMMY_PASSWORD_HASH)
    return user if user is not None and valid else None


def user_info(user: User) -> dict:
    return {
        "id": str(user.id),
        "workspace_id": str(user.workspace_id),
        "username": user.username,
        "role": user.role,
    }


def find_user(db: Session, actor: Actor, user_id) -> User:
    user = db.scalar(
        select(User).where(User.id == user_id, User.workspace_id == actor.workspace_id)
    )
    if user is None:
        raise AppError("USER_NOT_FOUND", "用户不存在", 404)
    return user


def require_role(actor: Actor, allowed: set[Role]):
    if actor.role not in allowed:
        raise AppError("FORBIDDEN", "当前角色无此操作权限", 403)
    return actor
