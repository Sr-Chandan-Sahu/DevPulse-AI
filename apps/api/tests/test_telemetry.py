import pytest
import datetime
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_telemetry_ingestion_and_querying(client: AsyncClient):
    # 1. Register and get project with API Key
    reg = await client.post("/api/v1/auth/register", json={
        "email": "dev@devpulse.ai",
        "password": "password123",
        "full_name": "Dev User",
        "organization_name": "DevPulse Ops"
    })
    token = reg.json()["tokens"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    proj_res = await client.post("/api/v1/projects", json={
        "name": "Auth Service",
        "description": "User token authority"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]

    key_res = await client.post(f"/api/v1/projects/{project_id}/api-keys", json={
        "name": "Ingest Key",
        "environment": "production"
    }, headers=auth_headers)
    raw_api_key = key_res.json()["raw_key"]

    # 2. Post Telemetry Batch
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    req_id = f"req_{uuid.uuid4().hex[:12]}"
    trc_id = f"trc_{uuid.uuid4().hex[:16]}"

    batch_payload = {
        "batch_id": "test_batch_1",
        "sent_at": now_iso,
        "environment": "production",
        "service": "auth-service",
        "requests": [
            {
                "request_id": req_id,
                "trace_id": trc_id,
                "timestamp": now_iso,
                "method": "POST",
                "url": "https://auth.internal/v1/login",
                "path": "/v1/login",
                "route": "/v1/login",
                "status_code": 200,
                "duration_ms": 45.2,
                "client_ip": "10.0.0.1",
                "user_agent": "TestClient/1.0",
                "request_headers": {"content-type": "application/json"},
                "request_body": "{\"username\": \"test\"}",
                "response_headers": {"content-type": "application/json"},
                "response_body": "{\"token\": \"eyJ...\"}",
                "database_duration_ms": 12.0,
                "cache_duration_ms": 1.5,
                "external_duration_ms": 0.0,
                "spans": [
                    {
                        "span_id": "spn_1",
                        "parent_span_id": None,
                        "name": "POST /v1/login",
                        "span_type": "http",
                        "service": "auth-service",
                        "duration_ms": 45.2,
                        "start_time": now_iso,
                        "end_time": now_iso,
                        "attributes": {}
                    }
                ],
                "logs": [
                    {
                        "level": "INFO",
                        "message": "User login authenticated",
                        "timestamp": now_iso,
                        "context": {}
                    }
                ]
            }
        ]
    }

    ingest_resp = await client.post(
        "/api/v1/telemetry/ingest",
        json=batch_payload,
        headers={"X-DevPulse-API-Key": raw_api_key}
    )
    assert ingest_resp.status_code == 202

    # 3. Query requests endpoint
    reqs_resp = await client.get(
        f"/api/v1/projects/{project_id}/requests",
        headers=auth_headers
    )
    assert reqs_resp.status_code == 200
    reqs_data = reqs_resp.json()
    assert reqs_data["total"] >= 1
    assert reqs_data["items"][0]["path"] == "/v1/login"

    # 4. Query trace detail
    trace_resp = await client.get(
        f"/api/v1/projects/{project_id}/traces/{trc_id}",
        headers=auth_headers
    )
    assert trace_resp.status_code == 200
    trace_data = trace_resp.json()
    assert trace_data["trace_id"] == trc_id
    assert len(trace_data["spans"]) >= 1

    # 5. Query metrics overview
    metrics_resp = await client.get(
        f"/api/v1/projects/{project_id}/metrics/overview?time_range=1h",
        headers=auth_headers
    )
    assert metrics_resp.status_code == 200
    metrics_data = metrics_resp.json()
    assert "summary" in metrics_data
    assert metrics_data["summary"]["total_requests"] >= 1
