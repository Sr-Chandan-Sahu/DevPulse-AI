from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.telemetry_repo import TelemetryRepository
from app.ai.services.ai_service import AIService
from app.schemas.ai import ExplainQueryRequest, SlowQueryAnalysisResult

router = APIRouter(prefix="/projects", tags=["Database"])

@router.get("/{project_id}/database")
async def get_database_analytics(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    queries = await repo.get_database_queries(project.id)
    return {
        "queries": [
            {
                "id": q.id,
                "query_hash": q.query_hash,
                "statement": q.statement,
                "table_name": q.table_name,
                "operation": q.operation,
                "avg_duration_ms": q.avg_duration_ms,
                "max_duration_ms": q.max_duration_ms,
                "call_count": q.call_count,
                "slow_count": q.slow_count,
                "last_seen": q.last_seen.isoformat()
            }
            for q in queries
        ],
        "summary": {
            "total_queries_tracked": sum(q.call_count for q in queries),
            "total_slow_queries": sum(q.slow_count for q in queries),
            "avg_db_duration_ms": round(sum(q.avg_duration_ms * q.call_count for q in queries) / max(1, sum(q.call_count for q in queries)), 1) if queries else 0.0
        }
    }

@router.post("/{project_id}/database/explain", response_model=SlowQueryAnalysisResult)
async def explain_database_query(
    project_id: str,
    request_in: ExplainQueryRequest,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    service = AIService(db)
    return await service.explain_query(
        statement=request_in.statement,
        table_name=request_in.table_name,
        avg_duration_ms=request_in.avg_duration_ms
    )
