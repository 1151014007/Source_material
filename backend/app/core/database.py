from functools import lru_cache
from urllib.parse import urlsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def validate_test_database_url(url: str) -> str:
    parsed = urlsplit(url)
    if (
        parsed.scheme not in {"postgresql", "postgresql+psycopg"}
        or not parsed.path.removeprefix("/").endswith("_test")
        or not parsed.hostname
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError(
            "Explicit PostgreSQL TEST_DATABASE_URL ending _test with no query is required"
        )
    return url


@lru_cache
def get_engine():
    return create_engine(get_settings().database_url, pool_pre_ping=True, hide_parameters=True)


@lru_cache
def get_session_factory():
    return sessionmaker(get_engine(), expire_on_commit=False)


def get_db():
    with get_session_factory()() as db:
        yield db
