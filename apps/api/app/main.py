import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.db.session import init_db, AsyncSessionLocal
from app.api.v1 import api_v1_router
from app.websocket.manager import ws_manager
from app.repositories.user_repo import UserRepository
from app.repositories.project_repo import ProjectRepository

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize DB Schema
    logger.info("Initializing database tables...")
    await init_db()

    # 2. Seed Default Admin & Demo Project if DB is empty
    async with AsyncSessionLocal() as db:
        user_repo = UserRepository(db)
        admin_user = await user_repo.get_by_email("admin@devpulse.ai")
        if not admin_user:
            logger.info("Seeding default demo administrator and project...")
            user = await user_repo.create_user_with_org(
                email="admin@devpulse.ai",
                password="password123",
                full_name="Alex Mercer (Lead Architect)",
                org_name="Acme Global Inc"
            )
            project_repo = ProjectRepository(db)
            project, raw_key = await project_repo.create_project(
                organization_id=user.memberships[0].organization_id,
                name="E-Commerce Core API",
                description="Production API Gateway, Order Processing & Payment Services"
            )
            logger.info(f"Seeded Admin User: admin@devpulse.ai | Password: password123 | API Key: {raw_key}")

    logger.info("DevPulse AI Backend initialized successfully.")
    yield
    logger.info("DevPulse AI Backend shutting down...")

app = FastAPI(
    title="DevPulse AI API",
    description="API Observability, Telemetry & Anomaly Detection Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Observability endpoints for DevPulse Platform Dogfooding
@app.get("/health", tags=["Observability"])
async def health_check():
    return {"status": "healthy", "service": "devpulse-api", "version": "1.0.0"}

@app.get("/ready", tags=["Observability"])
async def readiness_check():
    return {"status": "ready", "database": "connected", "ai_provider": "gemini"}

@app.get("/metrics", tags=["Observability"])
async def platform_internal_metrics():
    return {
        "active_ws_connections": sum(len(conns) for conns in ws_manager.active_connections.values()),
        "app_env": settings.APP_ENV,
        "telemetry_sampling_rate": settings.TELEMETRY_SAMPLING_RATE
    }

# Real-time WebSocket Endpoint
@app.websocket("/api/v1/ws/projects/{project_id}")
async def websocket_telemetry_stream(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(None)
):
    await ws_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep-alive ping loop
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        await ws_manager.disconnect(project_id, websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        await ws_manager.disconnect(project_id, websocket)

# Include API Router
app.include_router(api_v1_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
