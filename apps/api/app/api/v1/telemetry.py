import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks, status
from app.core.dependencies import verify_ingest_api_key
from app.db.models.project import Project
from app.schemas.telemetry import TelemetryBatchIngest
from app.services.telemetry.processor import process_telemetry_batch

router = APIRouter(prefix="/telemetry", tags=["Telemetry Ingestion"])

@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_telemetry(
    batch: TelemetryBatchIngest,
    background_tasks: BackgroundTasks,
    project: Project = Depends(verify_ingest_api_key)
):
    """
    High-throughput non-blocking telemetry ingestion endpoint.
    Accepts batched request traces, spans, and logs from devpulse-sdk.
    """
    # Enqueue background processing
    background_tasks.add_task(process_telemetry_batch, project.id, batch)
    
    return {
        "status": "accepted",
        "batch_id": batch.batch_id,
        "processed_requests_count": len(batch.requests)
    }
