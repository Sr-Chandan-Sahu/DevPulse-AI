import json
import hashlib
import datetime
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.db.models.telemetry import (
    RequestRecord,
    SpanRecord,
    LogRecord,
    ErrorRecord,
    DatabaseQueryRecord,
    RedisOperationRecord,
)
from app.schemas.telemetry import TelemetryBatchIngest, RequestTelemetryIngest
from app.websocket.manager import ws_manager
from app.services.anomalies.detector import evaluate_anomalies_for_request
from app.services.api_docs.generator import infer_and_save_endpoint_schema

def compute_fingerprint(error_type: str, error_message: str) -> str:
    # Normalize message (strip numbers/IDs)
    normalized = f"{error_type}:{error_message[:100]}"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]

def compute_query_hash(statement: str) -> str:
    return hashlib.sha256(statement.strip().encode("utf-8")).hexdigest()[:16]

async def process_telemetry_batch(project_id: str, batch: TelemetryBatchIngest):
    """
    Processes an incoming telemetry batch asynchronously.
    Writes records into the database, updates aggregations, and broadcasts live events.
    """
    async with AsyncSessionLocal() as db:
        for req in batch.requests:
            try:
                # 1. Create Request Record
                req_timestamp = datetime.datetime.fromisoformat(req.timestamp.replace("Z", "+00:00"))
                req_record = RequestRecord(
                    project_id=project_id,
                    request_id=req.request_id,
                    trace_id=req.trace_id,
                    timestamp=req_timestamp,
                    environment=batch.environment,
                    service=batch.service,
                    method=req.method,
                    url=req.url,
                    path=req.path,
                    route=req.route or req.path,
                    status_code=req.status_code,
                    duration_ms=req.duration_ms,
                    database_duration_ms=req.database_duration_ms,
                    cache_duration_ms=req.cache_duration_ms,
                    external_duration_ms=req.external_duration_ms,
                    client_ip=req.client_ip or "127.0.0.1",
                    user_agent=req.user_agent or "Unknown",
                    request_headers=json.dumps(req.request_headers),
                    request_body=req.request_body,
                    response_headers=json.dumps(req.response_headers),
                    response_body=req.response_body,
                    error_message=req.error_message,
                    error_type=req.error_type,
                    stack_trace=req.stack_trace
                )
                db.add(req_record)
                await db.flush()

                # 2. Insert Spans
                for span in req.spans:
                    span_rec = SpanRecord(
                        project_id=project_id,
                        request_record_id=req_record.id,
                        span_id=span.span_id,
                        parent_span_id=span.parent_span_id,
                        trace_id=req.trace_id,
                        name=span.name,
                        span_type=span.span_type,
                        service=span.service,
                        duration_ms=span.duration_ms,
                        start_time=span.start_time,
                        end_time=span.end_time,
                        attributes_json=json.dumps(span.attributes)
                    )
                    db.add(span_rec)

                    # If database span, update query stats
                    if span.span_type == "database" and "db.statement" in span.attributes:
                        stmt_text = span.attributes["db.statement"]
                        q_hash = compute_query_hash(stmt_text)
                        
                        # Find or create DatabaseQueryRecord
                        q_stmt = select(DatabaseQueryRecord).where(
                            DatabaseQueryRecord.project_id == project_id,
                            DatabaseQueryRecord.query_hash == q_hash
                        )
                        q_res = await db.execute(q_stmt)
                        db_q = q_res.scalar_one_or_none()
                        if not db_q:
                            db_q = DatabaseQueryRecord(
                                project_id=project_id,
                                query_hash=q_hash,
                                statement=stmt_text,
                                table_name=stmt_text.split()[2] if len(stmt_text.split()) > 2 else "unknown",
                                operation=stmt_text.split()[0].upper() if stmt_text.split() else "SELECT",
                                avg_duration_ms=span.duration_ms,
                                max_duration_ms=span.duration_ms,
                                call_count=1,
                                slow_count=1 if span.duration_ms > 200 else 0,
                                last_seen=req_timestamp
                            )
                            db.add(db_q)
                        else:
                            new_count = db_q.call_count + 1
                            db_q.avg_duration_ms = round(((db_q.avg_duration_ms * db_q.call_count) + span.duration_ms) / new_count, 2)
                            db_q.max_duration_ms = max(db_q.max_duration_ms, span.duration_ms)
                            db_q.call_count = new_count
                            if span.duration_ms > 200:
                                db_q.slow_count += 1
                            db_q.last_seen = req_timestamp

                    # If cache span, update redis operation stats
                    if span.span_type == "cache" and "redis.command" in span.attributes:
                        cmd = span.attributes["redis.command"]
                        key_pat = span.attributes.get("redis.key", "*")
                        r_stmt = select(RedisOperationRecord).where(
                            RedisOperationRecord.project_id == project_id,
                            RedisOperationRecord.command == cmd,
                            RedisOperationRecord.key_pattern == key_pat
                        )
                        r_res = await db.execute(r_stmt)
                        r_op = r_res.scalar_one_or_none()
                        if not r_op:
                            r_op = RedisOperationRecord(
                                project_id=project_id,
                                command=cmd,
                                key_pattern=key_pat,
                                avg_duration_ms=span.duration_ms,
                                call_count=1,
                                last_seen=req_timestamp
                            )
                            db.add(r_op)
                        else:
                            new_r_count = r_op.call_count + 1
                            r_op.avg_duration_ms = round(((r_op.avg_duration_ms * r_op.call_count) + span.duration_ms) / new_r_count, 2)
                            r_op.call_count = new_r_count
                            r_op.last_seen = req_timestamp

                # 3. Insert Logs
                for log in req.logs:
                    log_rec = LogRecord(
                        project_id=project_id,
                        request_record_id=req_record.id,
                        trace_id=req.trace_id,
                        request_id=req.request_id,
                        timestamp=datetime.datetime.fromisoformat(log.timestamp.replace("Z", "+00:00")),
                        level=log.level.upper(),
                        service=batch.service,
                        message=log.message,
                        context_json=json.dumps(log.context)
                    )
                    db.add(log_rec)

                # 4. Error Aggregation
                if req.status_code >= 400 or req.error_message:
                    err_type = req.error_type or f"HTTP {req.status_code} Error"
                    err_msg = req.error_message or f"Request failed with status {req.status_code}"
                    fprint = compute_fingerprint(err_type, err_msg)
                    
                    err_stmt = select(ErrorRecord).where(
                        ErrorRecord.project_id == project_id,
                        ErrorRecord.fingerprint == fprint
                    )
                    err_res = await db.execute(err_stmt)
                    err_rec = err_res.scalar_one_or_none()
                    if not err_rec:
                        err_rec = ErrorRecord(
                            project_id=project_id,
                            fingerprint=fprint,
                            error_type=err_type,
                            error_message=err_msg,
                            service=batch.service,
                            endpoint=req.path,
                            occurrence_count=1,
                            first_seen=req_timestamp,
                            last_seen=req_timestamp,
                            sample_trace_id=req.trace_id,
                            sample_request_id=req.request_id,
                            sample_stack_trace=req.stack_trace
                        )
                        db.add(err_rec)
                    else:
                        err_rec.occurrence_count += 1
                        err_rec.last_seen = req_timestamp
                        err_rec.sample_trace_id = req.trace_id
                        err_rec.sample_request_id = req.request_id
                        if req.stack_trace:
                            err_rec.sample_stack_trace = req.stack_trace

                await db.commit()

                # 5. Check Anomaly Detection Rules
                await evaluate_anomalies_for_request(project_id, req, db)

                # 6. Infer OpenAPI Endpoint & Schemas
                await infer_and_save_endpoint_schema(project_id, req, db)

                # 7. Broadcast Real-time Event via WebSocket
                await ws_manager.broadcast_to_project(
                    project_id=project_id,
                    event_type="NEW_REQUEST",
                    data={
                        "id": req_record.id,
                        "request_id": req.request_id,
                        "trace_id": req.trace_id,
                        "timestamp": req.timestamp,
                        "method": req.method,
                        "path": req.path,
                        "status_code": req.status_code,
                        "duration_ms": req.duration_ms,
                        "service": batch.service,
                        "environment": batch.environment,
                    }
                )

            except Exception as e:
                await db.rollback()
                import logging
                logging.getLogger("devpulse.processor").error(f"Error processing request telemetry: {e}")
