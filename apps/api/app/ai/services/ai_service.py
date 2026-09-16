from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.providers.base import AIProvider
from app.ai.providers.gemini import GeminiProvider
from app.repositories.anomaly_repo import AnomalyRepository
from app.repositories.metrics_repo import MetricsRepository
from app.repositories.telemetry_repo import TelemetryRepository
from app.schemas.ai import RootCauseAnalysisResult, SlowQueryAnalysisResult

# Singleton provider instance (Gemini as primary)
ai_provider: AIProvider = GeminiProvider()

class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.anomaly_repo = AnomalyRepository(db)
        self.metrics_repo = MetricsRepository(db)
        self.telemetry_repo = TelemetryRepository(db)

    async def analyze_anomaly_by_id(self, project_id: str, anomaly_id: str) -> RootCauseAnalysisResult:
        anomaly = await self.anomaly_repo.get_by_id(project_id, anomaly_id)
        if not anomaly:
            raise ValueError("Anomaly not found")

        # Gather rich telemetry context
        recent_requests, _ = await self.telemetry_repo.get_paginated_requests(
            project_id=project_id,
            service=anomaly.service,
            page_size=10
        )
        slow_queries = await self.telemetry_repo.get_database_queries(project_id)

        sample_req = recent_requests[0] if recent_requests else None
        latency_breakdown = {
            "total_ms": anomaly.metric_value,
            "database_ms": sample_req.database_duration_ms if sample_req else anomaly.metric_value * 0.6,
            "cache_ms": sample_req.cache_duration_ms if sample_req else 2.5,
            "external_ms": sample_req.external_duration_ms if sample_req else 10.0
        }

        context = {
            "project_id": project_id,
            "anomaly_type": anomaly.anomaly_type,
            "severity": anomaly.severity,
            "service": anomaly.service,
            "endpoint": anomaly.endpoint,
            "metric_value": anomaly.metric_value,
            "baseline_value": anomaly.baseline_value,
            "deviation_percent": anomaly.deviation_percent,
            "detected_at": anomaly.detected_at.isoformat(),
            "latency_breakdown": latency_breakdown,
            "slow_queries": [{"statement": q.statement, "avg_ms": q.avg_duration_ms} for q in slow_queries[:3]]
        }

        result = await ai_provider.analyze_anomaly(context)

        # Save analysis in database
        await self.anomaly_repo.save_ai_analysis(
            anomaly_id=anomaly.id,
            provider="gemini",
            model="gemini-2.5-flash",
            summary=result.summary,
            probable_root_cause=result.probable_root_cause,
            confidence_score=result.confidence_score,
            evidence=result.evidence,
            recommended_actions=result.recommended_actions,
            raw_prompt=str(context)
        )

        return result

    async def explain_query(self, statement: str, table_name: Optional[str] = None, avg_duration_ms: Optional[float] = None) -> SlowQueryAnalysisResult:
        context = {
            "statement": statement,
            "table_name": table_name or (statement.split()[2] if len(statement.split()) > 2 else "unknown"),
            "avg_duration_ms": avg_duration_ms or 150.0
        }
        return await ai_provider.explain_slow_query(context)

    async def chat_assistant(self, project_id: str, question: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        # Collect recent metrics summary for grounding
        dashboard = await self.metrics_repo.get_overview_dashboard(project_id, time_range="1h")
        anomalies = await self.anomaly_repo.list_for_project(project_id, status="ACTIVE")

        telemetry_context = {
            "summary": dashboard.summary.model_dump(),
            "slowest_endpoints": [e.model_dump() for e in dashboard.slowest_endpoints[:5]],
            "top_error_endpoints": [e.model_dump() for e in dashboard.top_error_endpoints[:5]],
            "active_anomalies": [{"title": a.title, "type": a.anomaly_type, "severity": a.severity} for a in anomalies]
        }

        answer = await ai_provider.chat_incident_assistant(question, telemetry_context, history)
        return {
            "answer": answer,
            "telemetry_grounding": telemetry_context,
            "suggested_followups": [
                "What are the slowest endpoints in the last hour?",
                "Are there any active database lock contentions?",
                "How does our current P95 latency compare to baseline?"
            ]
        }
