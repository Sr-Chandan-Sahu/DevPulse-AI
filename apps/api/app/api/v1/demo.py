import uuid
import random
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.schemas.telemetry import TelemetryBatchIngest, RequestTelemetryIngest, SpanIngest, LogIngest
from app.services.telemetry.processor import process_telemetry_batch

router = APIRouter(prefix="/demo", tags=["Demo Mode & Incident Simulator"])

ENDPOINTS = [
    ("GET", "/v1/products", "product-service", 25.0, 4.0, 1.5, 0.0),
    ("GET", "/v1/users/profile", "user-service", 42.0, 15.0, 3.0, 0.0),
    ("POST", "/v1/orders", "order-service", 120.0, 55.0, 4.0, 20.0),
    ("POST", "/v1/payments/charge", "payment-service", 185.0, 30.0, 2.0, 140.0),
    ("GET", "/v1/inventory/status", "inventory-service", 30.0, 10.0, 1.0, 0.0),
    ("GET", "/v1/recommendations", "ml-service", 95.0, 12.0, 2.0, 60.0),
    ("POST", "/v1/auth/token", "auth-service", 35.0, 18.0, 2.0, 0.0),
]

def make_simulated_request(
    method: str,
    path: str,
    service: str,
    base_duration: float,
    base_db: float,
    base_cache: float,
    base_ext: float,
    status_code: int = 200,
    error_msg: str = None,
    error_type: str = None
) -> RequestTelemetryIngest:
    req_id = f"req_{uuid.uuid4().hex[:12]}"
    trc_id = f"trc_{uuid.uuid4().hex[:16]}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    jitter = random.uniform(0.8, 1.3)
    duration = round(base_duration * jitter, 1)
    db_dur = round(base_db * jitter, 1)
    cache_dur = round(base_cache * jitter, 1)
    ext_dur = round(base_ext * jitter, 1)

    spans = [
        SpanIngest(
            span_id=f"spn_{uuid.uuid4().hex[:8]}",
            parent_span_id=None,
            name=f"{method} {path}",
            span_type="http",
            service=service,
            duration_ms=duration,
            start_time=now_iso,
            end_time=now_iso,
            attributes={"http.method": method, "http.status_code": status_code, "http.path": path}
        )
    ]

    if db_dur > 0:
        spans.append(SpanIngest(
            span_id=f"spn_{uuid.uuid4().hex[:8]}",
            parent_span_id=spans[0].span_id,
            name=f"SELECT * FROM {service.split('-')[0]}s WHERE id = $1",
            span_type="database",
            service="postgres-primary",
            duration_ms=db_dur,
            start_time=now_iso,
            end_time=now_iso,
            attributes={"db.statement": f"SELECT * FROM {service.split('-')[0]}s WHERE id = $1", "db.system": "postgresql"}
        ))

    if cache_dur > 0:
        spans.append(SpanIngest(
            span_id=f"spn_{uuid.uuid4().hex[:8]}",
            parent_span_id=spans[0].span_id,
            name=f"GET cache:{service.split('-')[0]}:session",
            span_type="cache",
            service="redis-cluster",
            duration_ms=cache_dur,
            start_time=now_iso,
            end_time=now_iso,
            attributes={"redis.command": "GET", "redis.key": f"cache:{service.split('-')[0]}:session"}
        ))

    if ext_dur > 0:
        spans.append(SpanIngest(
            span_id=f"spn_{uuid.uuid4().hex[:8]}",
            parent_span_id=spans[0].span_id,
            name="POST https://api.stripe.com/v1/charges",
            span_type="external",
            service="stripe-gateway",
            duration_ms=ext_dur,
            start_time=now_iso,
            end_time=now_iso,
            attributes={"http.url": "https://api.stripe.com/v1/charges"}
        ))

    return RequestTelemetryIngest(
        request_id=req_id,
        trace_id=trc_id,
        timestamp=now_iso,
        method=method,
        url=f"https://api.devpulse.internal{path}",
        path=path,
        route=path,
        status_code=status_code,
        duration_ms=duration,
        client_ip=f"192.168.1.{random.randint(2, 254)}",
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        request_headers={"content-type": "application/json", "authorization": "Bearer [REDACTED_TOKEN]"},
        request_body='{"action": "checkout", "items": [{"sku": "SKU_99", "qty": 1}]}',
        response_headers={"content-type": "application/json"},
        response_body='{"status": "success", "transaction_id": "tx_4482"}' if status_code == 200 else '{"error": "Failed"}',
        database_duration_ms=db_dur,
        cache_duration_ms=cache_dur,
        external_duration_ms=ext_dur,
        error_message=error_msg,
        error_type=error_type,
        stack_trace="Traceback (most recent call last):\n  File 'app/services/checkout.py', line 84, in execute_payment\n    raise GatewayTimeoutException('Payment gateway connection timed out after 5000ms')" if error_msg else None,
        spans=spans,
        logs=[
            LogIngest(level="INFO" if status_code < 400 else "ERROR", message=f"Processed {method} {path} with status {status_code}", timestamp=now_iso)
        ]
    )

@router.post("/{project_id}/generate-traffic")
async def generate_simulated_traffic(
    project_id: str,
    count: int = Query(15, ge=1, le=100),
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    requests = []
    for _ in range(count):
        m, p, s, dur, db_d, c_d, ext_d = random.choice(ENDPOINTS)
        status_c = 200
        err_m, err_t = None, None
        
        # 5% natural error rate
        if random.random() < 0.05:
            status_c = random.choice([400, 404, 500])
            err_m = "Resource validation error" if status_c == 400 else "Internal downstream failure"
            err_t = "ValidationError" if status_c == 400 else "InternalServerError"

        requests.append(make_simulated_request(m, p, s, dur, db_d, c_d, ext_d, status_c, err_m, err_t))

    batch = TelemetryBatchIngest(
        batch_id=f"sim_batch_{uuid.uuid4().hex[:8]}",
        sent_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        environment="production",
        service="api-gateway",
        requests=requests
    )

    await process_telemetry_batch(project.id, batch)
    return {"status": "success", "generated_requests": len(requests)}

@router.post("/{project_id}/trigger-incident/{scenario}")
async def trigger_simulated_incident(
    project_id: str,
    scenario: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    requests = []
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if scenario == "checkout_latency":
        # Scenario 1: Latency spike in checkout endpoint due to slow db query
        for _ in range(8):
            req = make_simulated_request(
                method="POST",
                path="/v1/checkout/process",
                service="checkout-service",
                base_duration=1250.0,
                base_db=950.0,
                base_cache=2.0,
                base_ext=180.0,
                status_code=200
            )
            requests.append(req)

    elif scenario == "error_surge":
        # Scenario 2: 500 error wave on payment endpoint
        for _ in range(10):
            req = make_simulated_request(
                method="POST",
                path="/v1/payments/charge",
                service="payment-service",
                base_duration=850.0,
                base_db=40.0,
                base_cache=2.0,
                base_ext=780.0,
                status_code=502,
                error_msg="PaymentGatewayTimeout: Stripe API endpoint unreachable (HTTP 502 Bad Gateway)",
                error_type="PaymentGatewayTimeout"
            )
            requests.append(req)

    elif scenario == "db_slowdown":
        # Scenario 3: Unindexed user query slowdown
        for _ in range(8):
            req = make_simulated_request(
                method="GET",
                path="/v1/users/search",
                service="user-service",
                base_duration=1100.0,
                base_db=1050.0,
                base_cache=1.0,
                base_ext=0.0,
                status_code=200
            )
            requests.append(req)

    elif scenario == "cache_drop":
        # Scenario 4: Redis cache hit rate drops
        for _ in range(12):
            req = make_simulated_request(
                method="GET",
                path="/v1/products/recommendations",
                service="product-service",
                base_duration=450.0,
                base_db=380.0,
                base_cache=0.5,
                base_ext=0.0,
                status_code=200
            )
            requests.append(req)
    else:
        raise HTTPException(status_code=400, detail="Invalid incident scenario")

    batch = TelemetryBatchIngest(
        batch_id=f"incident_batch_{uuid.uuid4().hex[:8]}",
        sent_at=now_iso,
        environment="production",
        service="incident-simulator",
        requests=requests
    )

    await process_telemetry_batch(project.id, batch)
    return {"status": "success", "scenario": scenario, "injected_requests": len(requests)}
