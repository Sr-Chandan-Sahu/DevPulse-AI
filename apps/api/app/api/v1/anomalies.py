import json
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.anomaly_repo import AnomalyRepository
from app.ai.services.ai_service import AIService
from app.schemas.anomaly import AnomalyResponse, AIAnalysisResponse

router = APIRouter(prefix="/projects", tags=["Anomalies"])

@router.get("/{project_id}/anomalies", response_model=List[AnomalyResponse])
async def list_anomalies(
    project_id: str,
    status: Optional[str] = Query("all"),
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = AnomalyRepository(db)
    records = await repo.list_for_project(project.id, status=status)
    
    responses = []
    for a in records:
        analysis_resp = None
        if a.ai_analysis:
            analysis_resp = AIAnalysisResponse(
                id=a.ai_analysis.id,
                anomaly_id=a.ai_analysis.anomaly_id,
                provider=a.ai_analysis.provider,
                model=a.ai_analysis.model,
                summary=a.ai_analysis.summary,
                probable_root_cause=a.ai_analysis.probable_root_cause,
                confidence_score=a.ai_analysis.confidence_score,
                evidence=json.loads(a.ai_analysis.evidence_json) if a.ai_analysis.evidence_json else [],
                recommended_actions=json.loads(a.ai_analysis.recommended_actions_json) if a.ai_analysis.recommended_actions_json else [],
                created_at=a.ai_analysis.created_at
            )

        responses.append(
            AnomalyResponse(
                id=a.id,
                project_id=a.project_id,
                title=a.title,
                anomaly_type=a.anomaly_type,
                severity=a.severity,
                status=a.status,
                service=a.service,
                endpoint=a.endpoint,
                detected_at=a.detected_at,
                resolved_at=a.resolved_at,
                metric_value=a.metric_value,
                baseline_value=a.baseline_value,
                deviation_percent=a.deviation_percent,
                signals=json.loads(a.signals_json) if a.signals_json else [],
                ai_analysis=analysis_resp
            )
        )
    return responses

@router.post("/{project_id}/anomalies/{anomaly_id}/analyze", response_model=AIAnalysisResponse)
async def analyze_anomaly(
    project_id: str,
    anomaly_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    ai_service = AIService(db)
    try:
        res = await ai_service.analyze_anomaly_by_id(project.id, anomaly_id)
        repo = AnomalyRepository(db)
        anomaly = await repo.get_by_id(project.id, anomaly_id)
        if not anomaly or not anomaly.ai_analysis:
            raise HTTPException(status_code=500, detail="Failed to persist analysis")

        return AIAnalysisResponse(
            id=anomaly.ai_analysis.id,
            anomaly_id=anomaly.ai_analysis.anomaly_id,
            provider=anomaly.ai_analysis.provider,
            model=anomaly.ai_analysis.model,
            summary=res.summary,
            probable_root_cause=res.probable_root_cause,
            confidence_score=res.confidence_score,
            evidence=res.evidence,
            recommended_actions=res.recommended_actions,
            created_at=anomaly.ai_analysis.created_at
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))

@router.post("/{project_id}/anomalies/{anomaly_id}/resolve")
async def resolve_anomaly(
    project_id: str,
    anomaly_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = AnomalyRepository(db)
    anomaly = await repo.get_by_id(project.id, anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found")
    
    anomaly.status = "RESOLVED"
    anomaly.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    return {"status": "success", "message": "Anomaly marked as resolved"}
