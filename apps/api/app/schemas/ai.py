from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class RootCauseAnalysisResult(BaseModel):
    summary: str = Field(description="Brief 1-2 sentence executive summary of the incident")
    severity: str = Field(default="HIGH", description="Incident severity: LOW, MEDIUM, HIGH, CRITICAL")
    probable_root_cause: str = Field(description="Detailed technical explanation of the root cause")
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    evidence: List[str] = Field(default_factory=list, description="List of specific telemetry signals that support this conclusion")
    recommended_actions: List[str] = Field(default_factory=list, description="Step-by-step actionable debugging and remediation recommendations")

class SlowQueryAnalysisResult(BaseModel):
    summary: str = Field(description="Summary of the database query performance bottleneck")
    issue_type: str = Field(description="e.g., Missing Index, Table Scan, N+1 Query, Lock Contention")
    estimated_impact: str = Field(description="e.g., High latency in checkout flow")
    recommended_indexes: List[str] = Field(default_factory=list, description="CREATE INDEX DDL statements")
    query_refactoring_advice: str = Field(description="Advice on how to rewrite the query or ORM call")

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    question: str
    conversation_history: List[ChatMessage] = Field(default_factory=list)
    time_window_minutes: int = 60

class ChatResponse(BaseModel):
    answer: str
    telemetry_grounding: Dict[str, Any] = Field(default_factory=dict)
    suggested_followups: List[str] = Field(default_factory=list)

class ExplainQueryRequest(BaseModel):
    statement: str
    table_name: Optional[str] = None
    avg_duration_ms: Optional[float] = None
