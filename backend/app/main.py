"""
VARUNA AI — FastAPI application entry point.

Wires together configuration, middleware, and the versioned API router.
Run locally with:  uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

# ── Cross-platform pickle compatibility ──────────────────────────────────────
# The model artifacts were serialised on Linux; loading them on Windows with a
# plain joblib.load() raises UnsupportedOperation from pathlib.PosixPath.__new__.
# The shim MUST be applied before any import of ai_models or the prediction
# service triggers a joblib.load() call.
from app.core import compat as _compat
_compat.apply()
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown hooks.

    Models are loaded once at startup (in prediction_service.py module scope)
    rather than per-request so that weights stay resident in memory.
    """
    configure_logging()
    logger.info("VARUNA AI backend starting", extra={"env": settings.ENVIRONMENT})
    yield
    logger.info("VARUNA AI backend shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Explainable AI-based extreme rainfall intelligence and early warning "
        "system using satellite data. Built for SIH problem statement SIH260006 (ISRO)."
    ),
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS: the React dashboard runs on a separate origin during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
