import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models.alert import AlertRule, AlertEvent
from app.websocket.manager import ws_manager

async def evaluate_alert_rules_for_metric(
    project_id: str,
    metric_type: str,
    current_value: float,
    service: str,
    endpoint: str,
    db: AsyncSession
):
    stmt = select(AlertRule).where(
        AlertRule.project_id == project_id,
        AlertRule.metric_type == metric_type,
        AlertRule.is_enabled == True
    )
    res = await db.execute(stmt)
    rules = res.scalars().all()

    for rule in rules:
        triggered = False
        if rule.operator == ">" and current_value > rule.threshold_value:
            triggered = True
        elif rule.operator == ">=" and current_value >= rule.threshold_value:
            triggered = True
        elif rule.operator == "<" and current_value < rule.threshold_value:
            triggered = True
        elif rule.operator == "<=" and current_value <= rule.threshold_value:
            triggered = True

        if triggered:
            event = AlertEvent(
                alert_rule_id=rule.id,
                triggered_at=datetime.datetime.now(datetime.timezone.utc),
                metric_value=current_value,
                threshold_value=rule.threshold_value,
                message=f"Alert '{rule.name}' fired: {metric_type} is {current_value:.2f} (Threshold: {rule.operator} {rule.threshold_value:.2f})",
                status="TRIGGERED"
            )
            db.add(event)
            await db.commit()

            await ws_manager.broadcast_to_project(
                project_id=project_id,
                event_type="ALERT_TRIGGERED",
                data={
                    "event_id": event.id,
                    "rule_id": rule.id,
                    "name": rule.name,
                    "metric_type": rule.metric_type,
                    "metric_value": current_value,
                    "threshold": rule.threshold_value,
                    "triggered_at": event.triggered_at.isoformat()
                }
            )
