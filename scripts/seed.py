import asyncio
import sys
import os
import uuid
import datetime
import random

# Add root and apps/api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from app.db.session import init_db, AsyncSessionLocal
from app.repositories.user_repo import UserRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.anomaly_repo import AnomalyRepository
from app.repositories.alert_repo import AlertRepository
from app.services.telemetry.processor import process_telemetry_batch
from app.schemas.telemetry import TelemetryBatchIngest, RequestTelemetryIngest, SpanIngest, LogIngest

ENDPOINTS = [
    ("GET", "/v1/products", "product-service", 28.0, 5.0, 1.2, 0.0),
    ("GET", "/v1/products/recommendations", "product-service", 45.0, 12.0, 1.0, 20.0),
    ("GET", "/v1/users/profile", "user-service", 38.0, 14.0, 2.5, 0.0),
    ("POST", "/v1/orders", "order-service", 145.0, 55.0, 3.2, 70.0),
    ("POST", "/v1/payments/charge", "payment-service", 210.0, 25.0, 2.0, 175.0),
    ("GET", "/v1/inventory/status", "inventory-service", 32.0, 8.0, 0.8, 0.0),
    ("POST", "/v1/auth/token", "auth-service", 40.0, 15.0, 2.0, 0.0),
]

async def seed_all():
    print("[INIT] Initializing DevPulse AI Database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        user_repo = UserRepository(db)
        project_repo = ProjectRepository(db)
        anomaly_repo = AnomalyRepository(db)
        alert_repo = AlertRepository(db)

        # 1. Create or fetch demo admin user
        user = await user_repo.get_by_email("admin@devpulse.ai")
        if not user:
            print("[USER] Creating Administrator (admin@devpulse.ai / password123)...")
            user = await user_repo.create_user_with_org(
                email="admin@devpulse.ai",
                password="password123",
                full_name="Alex Mercer (Lead Architect)",
                org_name="Acme Global Inc"
            )

        org_id = user.memberships[0].organization_id

        # 2. Create Project
        projects = await project_repo.list_for_user(user.id)
        if not projects:
            print("[PROJECT] Creating Demo Project 'E-Commerce Core API'...")
            project, api_key = await project_repo.create_project(
                organization_id=org_id,
                name="E-Commerce Core API",
                description="Production API Gateway, Order Processing & Payment Services"
            )
        else:
            project = projects[0]
            keys = await project_repo.list_api_keys(project.id)
            api_key = keys[0].key_prefix if keys else "dp_live_..."

        print(f"[OK] Project ID: {project.id}")

        # 3. Create Alert Rules
        rules = await alert_repo.list_rules(project.id)
        if not rules:
            print("[ALERT] Configuring Alert Rules...")
            await alert_repo.create_rule(
                project_id=project.id,
                name="P95 Latency Degradation (> 800ms)",
                metric_type="LATENCY_P95",
                operator=">",
                threshold_value=800.0,
                duration_window_minutes=5.0
            )
            await alert_repo.create_rule(
                project_id=project.id,
                name="High 5xx Error Rate (> 5%)",
                metric_type="ERROR_RATE",
                operator=">",
                threshold_value=0.05,
                duration_window_minutes=5.0
            )

        # 4. Generate 120 historical requests over the last 2 hours
        print("[DATA] Generating 120 realistic historical telemetry requests...")
        now = datetime.datetime.now(datetime.timezone.utc)
        requests_payload = []

        for i in range(120):
            req_time = now - datetime.timedelta(minutes=random.randint(1, 120), seconds=random.randint(0, 59))
            req_iso = req_time.isoformat()
            m, p, s, dur, db_d, c_d, ext_d = random.choice(ENDPOINTS)
            
            # Add some jitter
            jitter = random.uniform(0.7, 1.4)
            duration = round(dur * jitter, 1)
            db_dur = round(db_d * jitter, 1)
            cache_dur = round(c_d * jitter, 1)
            ext_dur = round(ext_d * jitter, 1)

            status_code = 200
            err_msg, err_type = None, None
            if random.random() < 0.06:
                status_code = random.choice([400, 404, 500, 502])
                if status_code == 500:
                    err_msg = "InternalServerError: Connection pool exhausted while acquiring connection"
                    err_type = "ConnectionPoolExhausted"
                elif status_code == 502:
                    err_msg = "BadGateway: Downstream payment provider timed out after 5000ms"
                    err_type = "GatewayTimeout"
                elif status_code == 400:
                    err_msg = "ValidationError: Field 'sku' must not be empty"
                    err_type = "ValidationError"
                else:
                    err_msg = "NotFoundError: Item not found"
                    err_type = "ResourceNotFound"

            req_id = f"req_{uuid.uuid4().hex[:12]}"
            trc_id = f"trc_{uuid.uuid4().hex[:16]}"
            root_spn_id = f"spn_{uuid.uuid4().hex[:8]}"

            spans = [
                SpanIngest(
                    span_id=root_spn_id,
                    parent_span_id=None,
                    name=f"{m} {p}",
                    span_type="http",
                    service=s,
                    duration_ms=duration,
                    start_time=req_iso,
                    end_time=req_iso,
                    attributes={"http.method": m, "http.status_code": status_code, "http.path": p}
                )
            ]

            if db_dur > 0:
                spans.append(SpanIngest(
                    span_id=f"spn_{uuid.uuid4().hex[:8]}",
                    parent_span_id=root_spn_id,
                    name=f"SELECT * FROM {s.split('-')[0]}s WHERE id = $1",
                    span_type="database",
                    service="postgres-primary",
                    duration_ms=db_dur,
                    start_time=req_iso,
                    end_time=req_iso,
                    attributes={"db.statement": f"SELECT * FROM {s.split('-')[0]}s WHERE id = $1", "db.system": "postgresql"}
                ))

            if cache_dur > 0:
                spans.append(SpanIngest(
                    span_id=f"spn_{uuid.uuid4().hex[:8]}",
                    parent_span_id=root_spn_id,
                    name=f"GET cache:{s.split('-')[0]}:session",
                    span_type="cache",
                    service="redis-cluster",
                    duration_ms=cache_dur,
                    start_time=req_iso,
                    end_time=req_iso,
                    attributes={"redis.command": "GET", "redis.key": f"cache:{s.split('-')[0]}:session"}
                ))

            if ext_dur > 0:
                spans.append(SpanIngest(
                    span_id=f"spn_{uuid.uuid4().hex[:8]}",
                    parent_span_id=root_spn_id,
                    name="POST https://api.stripe.com/v1/charges",
                    span_type="external",
                    service="stripe-gateway",
                    duration_ms=ext_dur,
                    start_time=req_iso,
                    end_time=req_iso,
                    attributes={"http.url": "https://api.stripe.com/v1/charges"}
                ))

            requests_payload.append(RequestTelemetryIngest(
                request_id=req_id,
                trace_id=trc_id,
                timestamp=req_iso,
                method=m,
                url=f"https://api.devpulse.internal{p}",
                path=p,
                route=p,
                status_code=status_code,
                duration_ms=duration,
                client_ip=f"192.168.1.{random.randint(2, 254)}",
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                request_headers={"content-type": "application/json", "authorization": "Bearer [REDACTED_TOKEN]"},
                request_body='{"action": "checkout", "items": [{"sku": "SKU_99", "qty": 1}]}',
                response_headers={"content-type": "application/json"},
                response_body='{"status": "success"}' if status_code == 200 else '{"error": "Failed"}',
                database_duration_ms=db_dur,
                cache_duration_ms=cache_dur,
                external_duration_ms=ext_dur,
                error_message=err_msg,
                error_type=err_type,
                spans=spans,
                logs=[LogIngest(level="INFO" if status_code < 400 else "ERROR", message=f"{m} {p} processed with status {status_code}", timestamp=req_iso)]
            ))

        # Batch insert in chunks of 30
        for chunk_idx in range(0, len(requests_payload), 30):
            chunk = requests_payload[chunk_idx:chunk_idx+30]
            batch = TelemetryBatchIngest(
                batch_id=f"seed_batch_{chunk_idx}",
                sent_at=now.isoformat(),
                environment="production",
                service="api-gateway",
                requests=chunk
            )
            await process_telemetry_batch(project.id, batch)

        print("[DONE] Seeding completed successfully!")
        print("[INFO] Login at http://localhost:5173 with:")
        print("       Email: admin@devpulse.ai")
        print("       Password: password123")

if __name__ == "__main__":
    asyncio.run(seed_all())
