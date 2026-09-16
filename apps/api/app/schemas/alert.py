from typing import Optional
import datetime
from pydantic import BaseModel, Field

class AlertRuleCreate(BaseModel):
    name: str
    metric_type: str  # LATENCY_P95, ERROR_RATE, 5XX_COUNT, DB_SLOW_QUERY
    operator: str = ">"
    threshold_value: float
    duration_window_minutes: float = 5.0
    service_filter: str = "all"
    endpoint_filter: str = ""
    notification_channel: str = "in_app"

class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    threshold_value: Optional[float] = None
    is_enabled: Optional[bool] = None

class AlertRuleResponse(BaseModel):
    id: str
    project_id: str
    name: str
    metric_type: str
    operator: str
    threshold_value: float
    duration_window_minutes: float
    service_filter: str
    endpoint_filter: str
    is_enabled: bool
    notification_channel: str
    created_at: datetime.datetime

class AlertEventResponse(BaseModel):
    id: str
    alert_rule_id: str
    triggered_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    metric_value: float
    threshold_value: float
    message: str
    status: str
