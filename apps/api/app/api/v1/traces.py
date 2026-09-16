import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.telemetry_repo import TelemetryRepository
from app.schemas.telemetry import TraceDetailResponse, SpanResponse

router = APIRouter(prefix="/projects", tags=["Traces"])

@router.get("/{project_id}/traces/{trace_id}", response_model=TraceDetailResponse)
async def get_trace_detail(
    project_id: str,
    trace_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    spans = await repo.get_trace_spans(project.id, trace_id)
    if not spans:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")

    span_responses = [
        SpanResponse(
            id=s.id,
            span_id=s.span_id,
            parent_span_id=s.parent_span_id,
            trace_id=s.trace_id,
            name=s.name,
            span_type=s.span_type,
            service=s.service,
            duration_ms=s.duration_ms,
            start_time=s.start_time,
            end_time=s.end_time,
            attributes=json.loads(s.attributes_json) if s.attributes_json else {}
        )
        for s in spans
    ]

    total_duration = max((s.duration_ms for s in spans), default=0.0)

    return TraceDetailResponse(
        trace_id=trace_id,
        total_duration_ms=total_duration,
        spans=span_responses
    )
