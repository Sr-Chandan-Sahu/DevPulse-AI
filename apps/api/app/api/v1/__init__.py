from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.metrics import router as metrics_router
from app.api.v1.requests import router as requests_router
from app.api.v1.traces import router as traces_router
from app.api.v1.logs import router as logs_router
from app.api.v1.errors import router as errors_router
from app.api.v1.database import router as database_router
from app.api.v1.redis import router as redis_router
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.ai import router as ai_router
from app.api.v1.api_docs import router as api_docs_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.demo import router as demo_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(metrics_router)
api_v1_router.include_router(requests_router)
api_v1_router.include_router(traces_router)
api_v1_router.include_router(logs_router)
api_v1_router.include_router(errors_router)
api_v1_router.include_router(database_router)
api_v1_router.include_router(redis_router)
api_v1_router.include_router(anomalies_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(api_docs_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(demo_router)
