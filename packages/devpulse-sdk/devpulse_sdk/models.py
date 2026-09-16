from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import datetime

class SpanPayload(BaseModel):
    span_id: str
    parent_span_id: Optional[str] = None
    name: str
    span_type: str = "custom"  # http, database, cache, external, custom
    service: str
    duration_ms: float
    start_time: str
    end_time: str
    attributes: Dict[str, Any] = Field(default_factory=dict)

class LogPayload(BaseModel):
    level: str
    message: str
    timestamp: str
    context: Dict[str, Any] = Field(default_factory=dict)

class RequestTelemetryPayload(BaseModel):
    request_id: str
    trace_id: str
    timestamp: str
    method: str
    url: str
    path: str
    route: Optional[str] = None
    status_code: int
    duration_ms: float
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_headers: Dict[str, str] = Field(default_factory=dict)
    request_body: Optional[str] = None
    response_headers: Dict[str, str] = Field(default_factory=dict)
    response_body: Optional[str] = None
    database_duration_ms: float = 0.0
    cache_duration_ms: float = 0.0
    external_duration_ms: float = 0.0
    error_message: Optional[str] = None
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    spans: List[SpanPayload] = Field(default_factory=list)
    logs: List[LogPayload] = Field(default_factory=list)

class TelemetryBatch(BaseModel):
    batch_id: str
    sent_at: str
    environment: str = "production"
    service: str = "api-service"
    requests: List[RequestTelemetryPayload] = Field(default_factory=list)
