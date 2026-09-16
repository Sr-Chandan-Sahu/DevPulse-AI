import argparse
import time
import random
import uuid
import datetime
import httpx

ENDPOINTS = [
    ("GET", "/v1/products", "product-service", 28.0, 5.0, 1.2, 0.0),
    ("GET", "/v1/products/recommendations", "product-service", 45.0, 12.0, 1.0, 20.0),
    ("GET", "/v1/users/profile", "user-service", 38.0, 14.0, 2.5, 0.0),
    ("POST", "/v1/orders", "order-service", 145.0, 55.0, 3.2, 70.0),
    ("POST", "/v1/payments/charge", "payment-service", 210.0, 25.0, 2.0, 175.0),
    ("GET", "/v1/inventory/status", "inventory-service", 32.0, 8.0, 0.8, 0.0),
    ("POST", "/v1/auth/token", "auth-service", 40.0, 15.0, 2.0, 0.0),
]

def generate_request(scenario="normal"):
    m, p, s, base_dur, base_db, base_cache, base_ext = random.choice(ENDPOINTS)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    status_code = 200
    err_msg, err_type = None, None

    if scenario == "checkout_latency":
        m, p, s = "POST", "/v1/checkout/process", "checkout-service"
        duration = random.uniform(1100.0, 1850.0)
        db_dur = random.uniform(850.0, 1500.0)
        cache_dur = 2.0
        ext_dur = 150.0
    elif scenario == "error_surge":
        m, p, s = "POST", "/v1/payments/charge", "payment-service"
        duration = random.uniform(400.0, 900.0)
        db_dur = 30.0
        cache_dur = 2.0
        ext_dur = duration - 50.0
        status_code = 502
        err_msg = "GatewayTimeout: Downstream Stripe payment API connection timed out"
        err_type = "PaymentGatewayTimeout"
    else:
        jitter = random.uniform(0.8, 1.25)
        duration = round(base_dur * jitter, 1)
        db_dur = round(base_db * jitter, 1)
        cache_dur = round(base_cache * jitter, 1)
        ext_dur = round(base_ext * jitter, 1)
        if random.random() < 0.04:
            status_code = random.choice([400, 404, 500])
            err_msg = "Internal Error" if status_code == 500 else "Validation Error"
            err_type = "InternalServerError" if status_code == 500 else "ValidationError"

    req_id = f"req_{uuid.uuid4().hex[:12]}"
    trc_id = f"trc_{uuid.uuid4().hex[:16]}"
    root_spn_id = f"spn_{uuid.uuid4().hex[:8]}"

    spans = [
        {
            "span_id": root_spn_id,
            "parent_span_id": None,
            "name": f"{m} {p}",
            "span_type": "http",
            "service": s,
            "duration_ms": duration,
            "start_time": now_iso,
            "end_time": now_iso,
            "attributes": {"http.method": m, "http.status_code": status_code, "http.path": p}
        }
    ]

    if db_dur > 0:
        spans.append({
            "span_id": f"spn_{uuid.uuid4().hex[:8]}",
            "parent_span_id": root_spn_id,
            "name": f"SELECT * FROM {s.split('-')[0]}s WHERE id = $1",
            "span_type": "database",
            "service": "postgres-primary",
            "duration_ms": db_dur,
            "start_time": now_iso,
            "end_time": now_iso,
            "attributes": {"db.statement": f"SELECT * FROM {s.split('-')[0]}s WHERE id = $1", "db.system": "postgresql"}
        })

    if cache_dur > 0:
        spans.append({
            "span_id": f"spn_{uuid.uuid4().hex[:8]}",
            "parent_span_id": root_spn_id,
            "name": f"GET cache:{s.split('-')[0]}:session",
            "span_type": "cache",
            "service": "redis-cluster",
            "duration_ms": cache_dur,
            "start_time": now_iso,
            "end_time": now_iso,
            "attributes": {"redis.command": "GET", "redis.key": f"cache:{s.split('-')[0]}:session"}
        })

    if ext_dur > 0:
        spans.append({
            "span_id": f"spn_{uuid.uuid4().hex[:8]}",
            "parent_span_id": root_spn_id,
            "name": "POST https://api.stripe.com/v1/charges",
            "span_type": "external",
            "service": "stripe-gateway",
            "duration_ms": ext_dur,
            "start_time": now_iso,
            "end_time": now_iso,
            "attributes": {"http.url": "https://api.stripe.com/v1/charges"}
        })

    return {
        "request_id": req_id,
        "trace_id": trc_id,
        "timestamp": now_iso,
        "method": m,
        "url": f"https://api.devpulse.internal{p}",
        "path": p,
        "route": p,
        "status_code": status_code,
        "duration_ms": duration,
        "client_ip": f"192.168.1.{random.randint(2, 254)}",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "request_headers": {"content-type": "application/json", "authorization": "Bearer [REDACTED_TOKEN]"},
        "request_body": '{"action": "test", "items": [{"sku": "SKU_99", "qty": 1}]}',
        "response_headers": {"content-type": "application/json"},
        "response_body": '{"status": "success"}' if status_code == 200 else '{"error": "Failed"}',
        "database_duration_ms": db_dur,
        "cache_duration_ms": cache_dur,
        "external_duration_ms": ext_dur,
        "error_message": err_msg,
        "error_type": err_type,
        "spans": spans,
        "logs": [
            {"level": "INFO" if status_code < 400 else "ERROR", "message": f"{m} {p} processed with status {status_code}", "timestamp": now_iso, "context": {}}
        ]
    }

def main():
    parser = argparse.ArgumentParser(description="DevPulse AI Telemetry Generator")
    parser.add_argument("--url", default="http://localhost:8000/api/v1/telemetry/ingest", help="Ingestion URL")
    parser.add_argument("--api-key", default="dp_live_default_key", help="Project Ingestion API Key")
    parser.add_argument("--continuous", action="store_true", help="Pumps telemetry continuously every 1-2 seconds")
    parser.add_argument("--scenario", default="normal", choices=["normal", "checkout_latency", "error_surge"], help="Incident scenario")
    args = parser.parse_args()

    client = httpx.Client(headers={"X-DevPulse-API-Key": args.api_key})
    print(f"🚀 DevPulse AI Traffic Generator running against {args.url} (Scenario: {args.scenario})...")

    try:
        while True:
            batch_size = random.randint(3, 8)
            requests = [generate_request(args.scenario) for _ in range(batch_size)]
            batch = {
                "batch_id": f"batch_{uuid.uuid4().hex[:8]}",
                "sent_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "environment": "production",
                "service": "api-gateway",
                "requests": requests
            }
            try:
                resp = client.post(args.url, json=batch, timeout=4.0)
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Ingested {len(requests)} requests -> Status: {resp.status_code}")
            except Exception as e:
                print(f"Failed to post batch: {e}")

            if not args.continuous:
                break
            time.sleep(random.uniform(1.0, 2.5))
    except KeyboardInterrupt:
        print("\nTraffic generator stopped.")

if __name__ == "__main__":
    main()
