import json
import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models.anomaly import AnomalyRecord
from app.schemas.telemetry import RequestTelemetryIngest
from app.websocket.manager import ws_manager

async def evaluate_anomalies_for_request(project_id: str, req: RequestTelemetryIngest, db: AsyncSession):
    """
    Evaluates incoming request telemetry for anomaly triggers.
    """
    # 1. Latency Spike Anomaly Trigger (> 800ms or database > 400ms)
    if req.duration_ms >= 800.0 or req.database_duration_ms >= 400.0:
        baseline_ms = 120.0
        deviation = round(((req.duration_ms - baseline_ms) / baseline_ms) * 100, 1)

        # Check if an active anomaly already exists for this endpoint to prevent duplicates
        existing_stmt = select(AnomalyRecord).where(
            AnomalyRecord.project_id == project_id,
            AnomalyRecord.endpoint == req.path,
            AnomalyRecord.anomaly_type == "LATENCY_SPIKE",
            AnomalyRecord.status == "ACTIVE"
        )
        existing_res = await db.execute(existing_stmt)
        if not existing_res.scalar_one_or_none():
            signals = [
                {"signal": "Total Latency", "value": f"{req.duration_ms:.1f}ms", "threshold": "800.0ms"},
                {"signal": "Database Duration", "value": f"{req.database_duration_ms:.1f}ms", "threshold": "400.0ms"},
                {"signal": "Trace ID", "value": req.trace_id, "threshold": "N/A"}
            ]
            anomaly = AnomalyRecord(
                project_id=project_id,
                title=f"Severe Latency Spike in {req.method} {req.path}",
                anomaly_type="LATENCY_SPIKE",
                severity="HIGH" if req.duration_ms < 2000 else "CRITICAL",
                status="ACTIVE",
                service=req.spans[0].service if req.spans else "api-service",
                endpoint=req.path,
                detected_at=datetime.datetime.now(datetime.timezone.utc),
                metric_value=req.duration_ms,
                baseline_value=baseline_ms,
                deviation_percent=deviation,
                signals_json=json.dumps(signals)
            )
            db.add(anomaly)
            await db.commit()

            # Broadcast anomaly alert via WebSocket
            await ws_manager.broadcast_to_project(
                project_id=project_id,
                event_type="ANOMALY_DETECTED",
                data={
                    "id": anomaly.id,
                    "title": anomaly.title,
                    "severity": anomaly.severity,
                    "endpoint": anomaly.endpoint,
                    "metric_value": anomaly.metric_value,
                    "deviation_percent": anomaly.deviation_percent,
                    "detected_at": anomaly.detected_at.isoformat()
                }
            )

    # 2. 5xx Error Surge Trigger
    elif req.status_code >= 500:
        existing_err_stmt = select(AnomalyRecord).where(
            AnomalyRecord.project_id == project_id,
            AnomalyRecord.endpoint == req.path,
            AnomalyRecord.anomaly_type == "ERROR_SURGE",
            AnomalyRecord.status == "ACTIVE"
        )
        existing_err_res = await db.execute(existing_err_stmt)
        if not existing_err_res.scalar_one_or_none():
            signals = [
                {"signal": "HTTP Status", "value": str(req.status_code), "threshold": "200 OK"},
                {"signal": "Error Message", "value": req.error_message or "Internal Server Error", "threshold": "None"},
                {"signal": "Trace ID", "value": req.trace_id, "threshold": "N/A"}
            ]
            anomaly = AnomalyRecord(
                project_id=project_id,
                title=f"HTTP {req.status_code} Error Wave on {req.method} {req.path}",
                anomaly_type="ERROR_SURGE",
                severity="CRITICAL",
                status="ACTIVE",
                service=req.spans[0].service if req.spans else "api-service",
                endpoint=req.path,
                detected_at=datetime.datetime.now(datetime.timezone.utc),
                metric_value=1.0,
                baseline_value=0.01,
                deviation_percent=990.0,
                signals_json=json.dumps(signals)
            )
            db.add(anomaly)
            await db.commit()

            await ws_manager.broadcast_to_project(
                project_id=project_id,
                event_type="ANOMALY_DETECTED",
                data={
                    "id": anomaly.id,
                    "title": anomaly.title,
                    "severity": anomaly.severity,
                    "endpoint": anomaly.endpoint,
                    "detected_at": anomaly.detected_at.isoformat()
                }
            )
