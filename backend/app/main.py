"""FastAPI application.

Day 1 shape: schemas, error envelope, health. The domain logic and persistence
land next; this exists so the contract can be exported and published before any
of it is written.
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes.learning import router as learning_router
from app.db.seed import init_db
from app.config import settings
from app.schemas.errors import ApiError

# The aggregate contract version, read from the governance file rather than
# duplicated here. docs/CONTRACTS.md requires format-specific version metadata
# to agree with contracts/VERSION, and the only way to guarantee that is to
# have one source.
_VERSION_FILE = Path(__file__).resolve().parents[2] / "contracts" / "VERSION"
CONTRACT_VERSION = _VERSION_FILE.read_text(encoding="utf-8").strip() if _VERSION_FILE.exists() else "0.0.0"


def _error(status: int, code: str, message: str, retryable: bool) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "retryable": retryable}},
    )


def create_app() -> FastAPI:
    # Tables and seeded content are ready before the first request. Idempotent,
    # so restarting with edited JSON is enough to reseed.
    init_db()

    app = FastAPI(
        title="Ecstacy",
        version=CONTRACT_VERSION,
        description=(
            "Adaptive GRE/GMAT quantitative reasoning. Composes a screen from "
            "observed learner behaviour and explains every instructional choice."
        ),
        responses={"default": {"model": ApiError, "description": "Error"}},
    )

    # Server-to-server calls carry no preflight — the Next.js server, not the
    # browser, talks to this service. CORS matters only for Swagger UI and
    # direct curl. Configured because FRONTEND_PLAN §19 asks for it, not
    # because it is an integration risk.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(StarletteHTTPException)
    def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Re-shape FastAPI's default envelope into the one the frontend reads."""
        return _error(
            exc.status_code,
            code=getattr(exc, "code", "http_error"),
            message=str(exc.detail),
            # 5xx might succeed on a retry; a 4xx is the caller's to fix.
            retryable=exc.status_code >= 500,
        )

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else {}
        location = ".".join(str(part) for part in first.get("loc", ())[1:]) or "request"
        return _error(
            422,
            code="invalid_request",
            message=f"{location}: {first.get('msg', 'is invalid')}",
            retryable=False,
        )

    # Audio must be playable the moment /ask responds: the frontend never calls
    # a TTS service, it just points an <audio> element at whatever URL the
    # block carries. Serving these directly keeps that promise with no extra
    # infrastructure, and the <audio> element has no crossorigin attribute so
    # the cross-origin fetch needs no CORS headers.
    audio_dir = Path(__file__).resolve().parent / "data" / "audio"
    if audio_dir.is_dir():
        app.mount("/static/audio", StaticFiles(directory=audio_dir), name="audio")

    app.include_router(learning_router)

    @app.get("/health", tags=["ops"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
