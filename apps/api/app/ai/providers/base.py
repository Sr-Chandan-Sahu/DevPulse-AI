from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.schemas.ai import RootCauseAnalysisResult, SlowQueryAnalysisResult

class AIProvider(ABC):
    @abstractmethod
    async def analyze_anomaly(self, telemetry_context: Dict[str, Any]) -> RootCauseAnalysisResult:
        """Analyzes an anomaly context and produces a structured root-cause report."""
        pass

    @abstractmethod
    async def explain_slow_query(self, query_context: Dict[str, Any]) -> SlowQueryAnalysisResult:
        """Analyzes a database query and provides optimization & indexing recommendations."""
        pass

    @abstractmethod
    async def chat_incident_assistant(
        self,
        question: str,
        telemetry_context: Dict[str, Any],
        history: List[Dict[str, str]]
    ) -> str:
        """Answers developer troubleshooting questions grounded in real telemetry."""
        pass
