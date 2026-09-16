from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.metrics_repo import MetricsRepository
from app.schemas.metrics import OverviewDashboardResponse

router = APIRouter(prefix="/projects", tags=["Metrics"])

@router.get("/{project_id}/metrics/overview", response_model=OverviewDashboardResponse)
async def get_project_metrics_overview(
    project_id: str,
    time_range: str = Query("1h", description="Time range: 5m, 15m, 1h, 6h, 24h, 7d"),
    service: Optional[str] = Query("all", description="Filter by service name"),
    environment: Optional[str] = Query("all", description="Filter by environment"),
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = MetricsRepository(db)
    return await repo.get_overview_dashboard(
        project_id=project.id,
        time_range=time_range,
        service=service,
        environment=environment
    )
