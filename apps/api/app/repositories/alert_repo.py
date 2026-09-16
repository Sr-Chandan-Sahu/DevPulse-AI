import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.models.alert import AlertRule, AlertEvent

class AlertRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_rules(self, project_id: str) -> List[AlertRule]:
        stmt = select(AlertRule).where(AlertRule.project_id == project_id).order_by(AlertRule.created_at.desc())
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create_rule(
        self,
        project_id: str,
        name: str,
        metric_type: str,
        operator: str,
        threshold_value: float,
        duration_window_minutes: float = 5.0,
        service_filter: str = "all",
        endpoint_filter: str = "",
        notification_channel: str = "in_app"
    ) -> AlertRule:
        rule = AlertRule(
            project_id=project_id,
            name=name,
            metric_type=metric_type,
            operator=operator,
            threshold_value=threshold_value,
            duration_window_minutes=duration_window_minutes,
            service_filter=service_filter,
            endpoint_filter=endpoint_filter,
            notification_channel=notification_channel,
            is_enabled=True
        )
        self.db.add(rule)
        await self.db.commit()
        await self.db.refresh(rule)
        return rule

    async def list_events(self, project_id: str) -> List[AlertEvent]:
        stmt = (
            select(AlertEvent)
            .join(AlertRule)
            .where(AlertRule.project_id == project_id)
            .order_by(AlertEvent.triggered_at.desc())
            .limit(100)
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def trigger_event(
        self,
        rule_id: str,
        metric_value: float,
        threshold_value: float,
        message: str
    ) -> AlertEvent:
        event = AlertEvent(
            alert_rule_id=rule_id,
            triggered_at=datetime.datetime.now(datetime.timezone.utc),
            metric_value=metric_value,
            threshold_value=threshold_value,
            message=message,
            status="TRIGGERED"
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event
