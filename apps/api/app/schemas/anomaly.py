from typing import List, Dict, Optional, Any
import datetime
from pydantic import BaseModel, Field

class AIAnalysisResponse(BaseModel):
    id: str
    anomaly_id: str
    provider: str
    model: str
    summary: str
    probable_root_cause: str
    confidence_score: float
    evidence: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    created_at: datetime.datetime

class AnomalyResponse(BaseModel):
    id: str
    project_id: str
    title: str
    anomaly_type: str
    severity: str
    status: str
    service: str
    endpoint: str
    detected_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    metric_value: float
    baseline_value: float
    deviation_percent: float
    signals: List[Dict[str, Any]] = Field(default_factory=list)
    ai_analysis: Optional[AIAnalysisResponse] = None
