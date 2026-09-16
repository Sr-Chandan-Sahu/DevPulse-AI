from typing import List, Dict, Optional
import datetime
from pydantic import BaseModel, Field

class MetricsSummary(BaseModel):
    total_requests: int
    requests_per_second: float
    error_rate: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    avg_latency_ms: float
    active_anomalies_count: int

class TimeSeriesPoint(BaseModel):
    timestamp: str
    rps: float
    p50_latency: float
    p95_latency: float
    p99_latency: float
    error_rate: float
    requests_count: int
    errors_count: int

class SlowEndpointItem(BaseModel):
    method: str
    path: str
    service: str
    avg_latency_ms: float
    p95_latency_ms: float
    call_count: int

class TopErrorEndpointItem(BaseModel):
    method: str
    path: str
    service: str
    error_count: int
    total_calls: int
    error_rate: float

class OverviewDashboardResponse(BaseModel):
    summary: MetricsSummary
    series: List[TimeSeriesPoint]
    slowest_endpoints: List[SlowEndpointItem]
    top_error_endpoints: List[TopErrorEndpointItem]
    service_health: Dict[str, str] = Field(default_factory=dict)
