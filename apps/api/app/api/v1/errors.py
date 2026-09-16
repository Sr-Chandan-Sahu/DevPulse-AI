from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.telemetry_repo import TelemetryRepository

router = APIRouter(prefix="/projects", tags=["Errors"])

@router.get("/{project_id}/errors")
async def list_error_clusters(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    errors = await repo.get_errors(project.id)
    return [
        {
            "id": e.id,
            "fingerprint": e.fingerprint,
            "error_type": e.error_type,
            "error_message": e.error_message,
            "service": e.service,
            "endpoint": e.endpoint,
            "occurrence_count": e.occurrence_count,
            "first_seen": e.first_seen.isoformat(),
            "last_seen": e.last_seen.isoformat(),
            "sample_trace_id": e.sample_trace_id,
            "sample_request_id": e.sample_request_id,
            "sample_stack_trace": e.sample_stack_trace
        }
        for e in errors
    ]
