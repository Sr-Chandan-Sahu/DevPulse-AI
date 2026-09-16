from typing import Dict, List, Optional, Any
import datetime
from pydantic import BaseModel, Field

# Ingestion Schemas
class SpanIngest(BaseModel):
    span_id: str
    parent_span_id: Optional[str] = None
    name: str
    span_type: str = "custom"
    service: str
    duration_ms: float
    start_time: str
    end_time: str
    attributes: Dict[str, Any] = Field(default_factory=dict)

class LogIngest(BaseModel):
    level: str
    message: str
    timestamp: str
    context: Dict[str, Any] = Field(default_factory=dict)

class RequestTelemetryIngest(BaseModel):
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
    spans: List[SpanIngest] = Field(default_factory=list)
    logs: List[LogIngest] = Field(default_factory=list)

class TelemetryBatchIngest(BaseModel):
    batch_id: str
    sent_at: str
    environment: str = "production"
    service: str = "api-service"
    requests: List[RequestTelemetryIngest] = Field(default_factory=list)

# Response Schemas
class SpanResponse(BaseModel):
    id: str
    span_id: str
    parent_span_id: Optional[str] = None
    trace_id: str
    name: str
    span_type: str
    service: str
    duration_ms: float
    start_time: str
    end_time: str
    attributes: Dict[str, Any] = Field(default_factory=dict)

class LogResponse(BaseModel):
    id: str
    trace_id: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: datetime.datetime
    level: str
    service: str
    message: str
    context: Dict[str, Any] = Field(default_factory=dict)

class RequestSummaryResponse(BaseModel):
    id: str
    request_id: str
    trace_id: str
    timestamp: datetime.datetime
    environment: str
    service: str
    method: str
    path: str
    status_code: int
    duration_ms: float
    database_duration_ms: float
    cache_duration_ms: float
    external_duration_ms: float
    error_message: Optional[str] = None

class RequestDetailResponse(RequestSummaryResponse):
    url: str
    route: str
    client_ip: str
    user_agent: str
    request_headers: Dict[str, str]
    request_body: Optional[str] = None
    response_headers: Dict[str, str]
    response_body: Optional[str] = None
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    spans: List[SpanResponse] = Field(default_factory=list)
    logs: List[LogResponse] = Field(default_factory=list)

class TraceDetailResponse(BaseModel):
    trace_id: str
    root_request: Optional[RequestSummaryResponse] = None
    total_duration_ms: float
    spans: List[SpanResponse] = Field(default_factory=list)

class PaginatedRequestsResponse(BaseModel):
    items: List[RequestSummaryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
