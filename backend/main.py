from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import load_settings, get_settings
from backend.database import init_db, close_db
from backend.services.scheduler import start_scheduler, stop_scheduler
from backend.services.terminal_manager import get_terminal_manager

from backend.routers import health, jobs, logs, resources, terminal, calendar, notion, notifications, config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    logger.info(f"Starting HPC Tracker on {settings.server.host}:{settings.server.port}")

    await init_db()
    logger.info("Database initialized")

    start_scheduler()
    logger.info("Background scheduler started")

    yield

    # Shutdown
    stop_scheduler()
    get_terminal_manager().shutdown()
    await close_db()
    logger.info("HPC Tracker shut down")


def create_app() -> FastAPI:
    load_settings()

    app = FastAPI(
        title="HPC Tracker",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Register routers
    app.include_router(health.router)
    app.include_router(jobs.router)
    app.include_router(logs.router)
    app.include_router(resources.router)
    app.include_router(terminal.router)
    app.include_router(calendar.router)
    app.include_router(notion.router)
    app.include_router(notifications.router)
    app.include_router(config.router)

    # Serve frontend static files
    base_dir = Path(__file__).resolve().parent.parent
    static_dir = base_dir / "frontend" / "dist"
    if static_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            # Serve index.html for all non-API routes (SPA routing)
            file_path = static_dir / full_path
            if file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(static_dir / "index.html"))

    return app


app = create_app()
