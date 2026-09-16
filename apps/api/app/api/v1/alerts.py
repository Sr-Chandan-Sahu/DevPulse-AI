from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.alert_repo import AlertRepository
from app.schemas.alert import AlertRuleCreate, AlertRuleResponse, AlertEventResponse

router = APIRouter(prefix="/projects", tags=["Alerts"])

@router.get("/{project_id}/alerts", response_model=List[AlertRuleResponse])
async def list_alert_rules(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = AlertRepository(db)
    rules = await repo.list_rules(project.id)
    return [
        AlertRuleResponse(
            id=r.id,
            project_id=r.project_id,
            name=r.name,
            metric_type=r.metric_type,
            operator=r.operator,
            threshold_value=r.threshold_value,
            duration_window_minutes=r.duration_window_minutes,
            service_filter=r.service_filter,
            endpoint_filter=r.endpoint_filter,
            is_enabled=r.is_enabled,
            notification_channel=r.notification_channel,
            created_at=r.created_at
        )
        for r in rules
    ]

@router.post("/{project_id}/alerts", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    project_id: str,
    rule_in: AlertRuleCreate,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = AlertRepository(db)
    rule = await repo.create_rule(
        project_id=project.id,
        name=rule_in.name,
        metric_type=rule_in.metric_type,
        operator=rule_in.operator,
        threshold_value=rule_in.threshold_value,
        duration_window_minutes=rule_in.duration_window_minutes,
        service_filter=rule_in.service_filter,
        endpoint_filter=rule_in.endpoint_filter,
        notification_channel=rule_in.notification_channel
    )
    return AlertRuleResponse(
        id=rule.id,
        project_id=rule.project_id,
        name=rule.name,
        metric_type=rule.metric_type,
        operator=rule.operator,
        threshold_value=rule.threshold_value,
        duration_window_minutes=rule.duration_window_minutes,
        service_filter=rule.service_filter,
        endpoint_filter=rule.endpoint_filter,
        is_enabled=rule.is_enabled,
        notification_channel=rule.notification_channel,
        created_at=rule.created_at
    )

@router.get("/{project_id}/alerts/events", response_model=List[AlertEventResponse])
async def list_alert_events(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = AlertRepository(db)
    events = await repo.list_events(project.id)
    return [
        AlertEventResponse(
            id=e.id,
            alert_rule_id=e.alert_rule_id,
            triggered_at=e.triggered_at,
            resolved_at=e.resolved_at,
            metric_value=e.metric_value,
            threshold_value=e.threshold_value,
            message=e.message,
            status=e.status
        )
        for e in events
    ]
