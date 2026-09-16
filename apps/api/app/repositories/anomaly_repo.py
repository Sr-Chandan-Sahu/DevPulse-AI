import json
import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.models.anomaly import AnomalyRecord, AIAnalysisRecord

class AnomalyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_project(self, project_id: str, status: Optional[str] = None) -> List[AnomalyRecord]:
        filters = [AnomalyRecord.project_id == project_id]
        if status and status != "all":
            filters.append(AnomalyRecord.status == status.upper())

        stmt = (
            select(AnomalyRecord)
            .options(selectinload(AnomalyRecord.ai_analysis))
            .where(and_(*filters))
            .order_by(AnomalyRecord.detected_at.desc())
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_by_id(self, project_id: str, anomaly_id: str) -> Optional[AnomalyRecord]:
        stmt = (
            select(AnomalyRecord)
            .options(selectinload(AnomalyRecord.ai_analysis))
            .where(AnomalyRecord.project_id == project_id, AnomalyRecord.id == anomaly_id)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_anomaly(
        self,
        project_id: str,
        title: str,
        anomaly_type: str,
        severity: str,
        service: str,
        endpoint: str,
        metric_value: float,
        baseline_value: float,
        deviation_percent: float,
        signals: list
    ) -> AnomalyRecord:
        anomaly = AnomalyRecord(
            project_id=project_id,
            title=title,
            anomaly_type=anomaly_type,
            severity=severity,
            status="ACTIVE",
            service=service,
            endpoint=endpoint,
            detected_at=datetime.datetime.now(datetime.timezone.utc),
            metric_value=metric_value,
            baseline_value=baseline_value,
            deviation_percent=deviation_percent,
            signals_json=json.dumps(signals)
        )
        self.db.add(anomaly)
        await self.db.commit()
        await self.db.refresh(anomaly)
        return anomaly

    async def save_ai_analysis(
        self,
        anomaly_id: str,
        provider: str,
        model: str,
        summary: str,
        probable_root_cause: str,
        confidence_score: float,
        evidence: list,
        recommended_actions: list,
        raw_prompt: str = ""
    ) -> AIAnalysisRecord:
        analysis = AIAnalysisRecord(
            anomaly_id=anomaly_id,
            provider=provider,
            model=model,
            summary=summary,
            probable_root_cause=probable_root_cause,
            confidence_score=confidence_score,
            evidence_json=json.dumps(evidence),
            recommended_actions_json=json.dumps(recommended_actions),
            raw_prompt=raw_prompt
        )
        self.db.add(analysis)
        await self.db.commit()
        await self.db.refresh(analysis)
        return analysis
