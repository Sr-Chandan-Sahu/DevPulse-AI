import json
import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_
from sqlalchemy.orm import selectinload

from app.db.models.telemetry import (
    RequestRecord,
    SpanRecord,
    LogRecord,
    ErrorRecord,
    DatabaseQueryRecord,
    RedisOperationRecord,
)

class TelemetryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_paginated_requests(
        self,
        project_id: str,
        page: int = 1,
        page_size: int = 25,
        service: Optional[str] = None,
        environment: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        min_duration: Optional[float] = None,
        search: Optional[str] = None,
        time_from: Optional[datetime.datetime] = None,
    ) -> Tuple[List[RequestRecord], int]:
        filters = [RequestRecord.project_id == project_id]

        if service and service != "all":
            filters.append(RequestRecord.service == service)
        if environment and environment != "all":
            filters.append(RequestRecord.environment == environment)
        if method and method != "all":
            filters.append(RequestRecord.method == method.upper())
        if status_code:
            filters.append(RequestRecord.status_code == status_code)
        if min_duration:
            filters.append(RequestRecord.duration_ms >= min_duration)
        if search:
            filters.append(
                or_(
                    RequestRecord.path.ilike(f"%{search}%"),
                    RequestRecord.trace_id.ilike(f"%{search}%"),
                    RequestRecord.request_id.ilike(f"%{search}%")
                )
            )
        if time_from:
            filters.append(RequestRecord.timestamp >= time_from)

        # Count total
        count_stmt = select(func.count(RequestRecord.id)).where(and_(*filters))
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar_one() or 0

        # Fetch page
        stmt = (
            select(RequestRecord)
            .where(and_(*filters))
            .order_by(RequestRecord.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        res = await self.db.execute(stmt)
        items = res.scalars().all()
        return items, total

    async def get_request_detail(self, project_id: str, request_id: str) -> Optional[RequestRecord]:
        stmt = (
            select(RequestRecord)
            .options(
                selectinload(RequestRecord.spans),
                selectinload(RequestRecord.logs)
            )
            .where(
                RequestRecord.project_id == project_id,
                or_(
                    RequestRecord.id == request_id,
                    RequestRecord.request_id == request_id
                )
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_trace_spans(self, project_id: str, trace_id: str) -> List[SpanRecord]:
        stmt = (
            select(SpanRecord)
            .where(
                SpanRecord.project_id == project_id,
                SpanRecord.trace_id == trace_id
            )
            .order_by(SpanRecord.start_time.asc())
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_logs(
        self,
        project_id: str,
        limit: int = 100,
        level: Optional[str] = None,
        service: Optional[str] = None,
        trace_id: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[LogRecord]:
        filters = [LogRecord.project_id == project_id]
        if level and level != "all":
            filters.append(LogRecord.level == level.upper())
        if service and service != "all":
            filters.append(LogRecord.service == service)
        if trace_id:
            filters.append(LogRecord.trace_id == trace_id)
        if search:
            filters.append(LogRecord.message.ilike(f"%{search}%"))

        stmt = select(LogRecord).where(and_(*filters)).order_by(LogRecord.timestamp.desc()).limit(limit)
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_errors(self, project_id: str) -> List[ErrorRecord]:
        stmt = select(ErrorRecord).where(ErrorRecord.project_id == project_id).order_by(ErrorRecord.last_seen.desc())
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_database_queries(self, project_id: str) -> List[DatabaseQueryRecord]:
        stmt = (
            select(DatabaseQueryRecord)
            .where(DatabaseQueryRecord.project_id == project_id)
            .order_by(DatabaseQueryRecord.avg_duration_ms.desc())
            .limit(50)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_redis_operations(self, project_id: str) -> List[RedisOperationRecord]:
        stmt = (
            select(RedisOperationRecord)
            .where(RedisOperationRecord.project_id == project_id)
            .order_by(RedisOperationRecord.call_count.desc())
            .limit(50)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()
