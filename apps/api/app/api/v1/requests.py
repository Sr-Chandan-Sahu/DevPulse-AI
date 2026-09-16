import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.telemetry_repo import TelemetryRepository
from app.schemas.telemetry import (
    PaginatedRequestsResponse,
    RequestSummaryResponse,
    RequestDetailResponse,
    SpanResponse,
    LogResponse
)

router = APIRouter(prefix="/projects", tags=["Requests"])

@router.get("/{project_id}/requests", response_model=PaginatedRequestsResponse)
async def list_requests(
    project_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    service: Optional[str] = Query("all"),
    environment: Optional[str] = Query("all"),
    method: Optional[str] = Query("all"),
    status_code: Optional[int] = Query(None),
    min_duration: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    items, total = await repo.get_paginated_requests(
        project_id=project.id,
        page=page,
        page_size=page_size,
        service=service,
        environment=environment,
        method=method,
        status_code=status_code,
        min_duration=min_duration,
        search=search
    )

    summaries = [
        RequestSummaryResponse(
            id=r.id,
            request_id=r.request_id,
            trace_id=r.trace_id,
            timestamp=r.timestamp,
            environment=r.environment,
            service=r.service,
            method=r.method,
            path=r.path,
            status_code=r.status_code,
            duration_ms=r.duration_ms,
            database_duration_ms=r.database_duration_ms,
            cache_duration_ms=r.cache_duration_ms,
            external_duration_ms=r.external_duration_ms,
            error_message=r.error_message
        )
        for r in items
    ]

    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedRequestsResponse(
        items=summaries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{project_id}/requests/{request_id}", response_model=RequestDetailResponse)
async def get_request_detail(
    project_id: str,
    request_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    req = await repo.get_request_detail(project.id, request_id)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    req_headers = json.loads(req.request_headers) if req.request_headers else {}
    resp_headers = json.loads(req.response_headers) if req.response_headers else {}

    spans = [
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
        for s in req.spans
    ]

    logs = [
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
        for l in req.logs
    ]

    return RequestDetailResponse(
        id=req.id,
        request_id=req.request_id,
        trace_id=req.trace_id,
        timestamp=req.timestamp,
        environment=req.environment,
        service=req.service,
        method=req.method,
        path=req.path,
        status_code=req.status_code,
        duration_ms=req.duration_ms,
        database_duration_ms=req.database_duration_ms,
        cache_duration_ms=req.cache_duration_ms,
        external_duration_ms=req.external_duration_ms,
        error_message=req.error_message,
        url=req.url,
        route=req.route,
        client_ip=req.client_ip,
        user_agent=req.user_agent,
        request_headers=req_headers,
        request_body=req.request_body,
        response_headers=resp_headers,
        response_body=req.response_body,
        error_type=req.error_type,
        stack_trace=req.stack_trace,
        spans=spans,
        logs=logs
    )
