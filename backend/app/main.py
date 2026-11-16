from contextlib import asynccontextmanager
from typing import Tuple
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.routes import router as v1_router
from app.core.config import settings
from app.core.errors import AppError, app_error_handler
from app.db.session import Base, engine


def _parse_semver(version: str) -> Tuple[int, int, int]:
    parts = (version.strip().split(".") + ["0", "0", "0"])[:3]
    try:
        return int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        return 1, 0, 0


@asynccontextmanager
async def lifespan(_app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="Scribeo AI Handwriting Backend API",
        version="1.0.0",
        description="FastAPI backend for English handwriting OCR, Gemini summaries, and Supabase storage",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def version_and_rate_limit_headers(request: Request, call_next):
        client_version = request.headers.get("X-App-Version")
        if client_version and request.url.path != "/api/v1/health":
            if _parse_semver(client_version) < _parse_semver(settings.min_app_version):
                return JSONResponse(
                    status_code=426,
                    content={
                        "error": {
                            "code": "UPGRADE_REQUIRED",
                            "message": f"Please update the app to version {settings.min_app_version} or newer.",
                        }
                    },
                )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit-Scans"] = str(settings.daily_scan_limit)
        response.headers["X-RateLimit-Limit-Summaries"] = str(settings.daily_summary_limit)
        return response

    application.add_exception_handler(AppError, app_error_handler)
    application.include_router(v1_router)
    return application


app = create_app()
