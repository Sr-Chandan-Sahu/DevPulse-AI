import json
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.telemetry_repo import TelemetryRepository
from app.schemas.telemetry import LogResponse

router = APIRouter(prefix="/projects", tags=["Logs"])

@router.get("/{project_id}/logs", response_model=List[LogResponse])
async def list_logs(
    project_id: str,
    limit: int = Query(100, ge=1, le=500),
    level: Optional[str] = Query("all"),
    service: Optional[str] = Query("all"),
    trace_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    logs = await repo.get_logs(
        project_id=project.id,
        limit=limit,
        level=level,
        service=service,
        trace_id=trace_id,
        search=search
    )
    return [
        LogResponse(
            id=l.id,
            trace_id=l.trace_id,
            request_id=l.request_id,
            timestamp=l.timestamp,
            level=l.level,
            service=l.service,
            message=l.message,
            context=json.loads(l.context_json) if l.context_json else {}
        )
        for l in logs
    ]
