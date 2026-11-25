from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from redis import Redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.modules.identity.router import router as identity_router
from app.modules.system.router import router as system_router


@asynccontextmanager
async def lifespan(app):
    get_settings().validate_runtime()
    yield


def create_app():
    app = FastAPI(title="映库 MediaAtlas", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def request_metadata(request: Request, call_next):
        request.state.request_id = uuid4().hex
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(AppError)
    async def app_error(request: Request, error: AppError):
        return JSONResponse(
            status_code=error.status,
            content={
                "code": error.code,
                "message": error.message,
                "request_id": request.state.request_id,
                "details": {},
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        details = [
            {"loc": list(e["loc"]), "type": e["type"], "message": e["msg"]} for e in error.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "code": "VALIDATION_ERROR",
                "message": "请检查输入内容",
                "request_id": request.state.request_id,
                "details": details,
            },
        )

    @app.get("/health/live")
    def live():
        return {"status": "alive", "service": "media-atlas"}

    @app.get("/health/ready")
    def ready(db: Session = Depends(get_db), settings: Settings = Depends(get_settings)):
        checks = {"database": False, "redis": False}
        try:
            db.execute(text("SELECT 1"))
            db.execute(text("SELECT id FROM users LIMIT 1"))
            checks["database"] = True
        except Exception:
            db.rollback()
        try:
            with Redis.from_url(
                settings.redis_url, socket_timeout=2, socket_connect_timeout=2
            ) as redis:
                checks["redis"] = bool(redis.ping())
        except Exception:
            pass
        return JSONResponse(
            status_code=200 if all(checks.values()) else 503,
            content={"status": "ready" if all(checks.values()) else "degraded", "checks": checks},
        )

    app.include_router(identity_router)
    app.include_router(system_router)
    return app


app = create_app()
