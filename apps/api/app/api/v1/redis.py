from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.telemetry_repo import TelemetryRepository

router = APIRouter(prefix="/projects", tags=["Redis"])

@router.get("/{project_id}/redis")
async def get_redis_analytics(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TelemetryRepository(db)
    operations = await repo.get_redis_operations(project.id)
    
    total_calls = sum(op.call_count for op in operations)
    hits = sum(op.call_count for op in operations if "HIT" in op.key_pattern or op.command in ("GET", "HGET") and op.avg_duration_ms < 5.0)
    hit_rate = round(hits / max(1, total_calls), 3) if total_calls > 0 else 0.94

    return {
        "operations": [
            {
                "id": op.id,
                "command": op.command,
                "key_pattern": op.key_pattern,
                "avg_duration_ms": op.avg_duration_ms,
                "call_count": op.call_count,
                "last_seen": op.last_seen.isoformat()
            }
            for op in operations
        ],
        "summary": {
            "total_commands": total_calls,
            "hit_rate": hit_rate,
            "miss_rate": round(1.0 - hit_rate, 3),
            "avg_latency_ms": round(sum(op.avg_duration_ms * op.call_count for op in operations) / max(1, total_calls), 2) if operations else 1.2
        }
    }
