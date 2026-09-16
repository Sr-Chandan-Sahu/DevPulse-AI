# DEV PULSE AI — REST API & WebSocket Specifications

All REST API endpoints are prefixed with `/api/v1/`.

## Authentication & Multi-Tenancy

### Headers
- Bearer Auth for Web App: `Authorization: Bearer <jwt_access_token>`
- Ingestion Auth for SDK: `X-DevPulse-API-Key: dp_live_<token>`

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
- **Body**: `{ "email": "user@example.com", "password": "secure_password", "full_name": "Jane Doe", "organization_name": "Acme Inc" }`
- **Response `201`**: `{ "user": { "id": "...", "email": "..." }, "tokens": { "access_token": "...", "refresh_token": "...", "token_type": "bearer" } }`

### `POST /api/v1/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "secure_password" }`
- **Response `200`**: `{ "user": { "id": "...", "email": "..." }, "tokens": { "access_token": "...", "refresh_token": "...", "token_type": "bearer" } }`

### `POST /api/v1/auth/refresh`
- **Body**: `{ "refresh_token": "..." }`
- **Response `200`**: `{ "access_token": "...", "refresh_token": "...", "token_type": "bearer" }`

### `GET /api/v1/auth/me`
- **Response `200`**: User profile, current organization, projects, and RBAC role.

---

## 2. Projects & Settings (`/api/v1/projects`)

### `GET /api/v1/projects`
List all projects accessible to the authenticated user.

### `POST /api/v1/projects`
Create a new project.
- **Body**: `{ "name": "Checkout API", "description": "Production checkout service" }`

### `GET /api/v1/projects/{project_id}/api-keys`
List active API keys for ingestion.

### `POST /api/v1/projects/{project_id}/api-keys`
Create a new API key.
- **Body**: `{ "name": "Prod Ingestion Key", "environment": "production" }`
- **Response `201`**: `{ "id": "...", "name": "...", "key": "dp_live_..." }` *(raw key only returned once)*

---

## 3. Telemetry Ingestion (`/api/v1/telemetry`)

### `POST /api/v1/telemetry/ingest`
- **Headers**: `X-DevPulse-API-Key: dp_live_...`
- **Body**:
```json
{
  "batch_id": "uuid",
  "sent_at": "2026-09-16T12:00:00Z",
  "environment": "production",
  "service": "order-service",
  "requests": [
    {
      "request_id": "req-12345",
      "trace_id": "trc-abcde",
      "timestamp": "2026-09-16T11:59:59Z",
      "method": "POST",
      "url": "https://api.acme.com/v1/orders",
      "path": "/v1/orders",
      "route": "/v1/orders",
      "status_code": 201,
      "duration_ms": 142.5,
      "client_ip": "192.168.1.1",
      "user_agent": "Mozilla/5.0 ...",
      "request_headers": { "content-type": "application/json" },
      "request_body": "{\"item_id\": \"sku_99\", \"qty\": 2}",
      "response_headers": { "content-type": "application/json" },
      "response_body": "{\"order_id\": \"ord_1001\", \"status\": \"created\"}",
      "database_duration_ms": 45.2,
      "cache_duration_ms": 3.1,
      "external_duration_ms": 80.0,
      "error_message": null,
      "spans": [
        {
          "span_id": "spn-1",
          "parent_span_id": null,
          "name": "HTTP POST /v1/orders",
          "span_type": "http",
          "service": "order-service",
          "duration_ms": 142.5,
          "start_time": "2026-09-16T11:59:59.000Z",
          "end_time": "2026-09-16T11:59:59.142Z"
        },
        {
          "span_id": "spn-2",
          "parent_span_id": "spn-1",
          "name": "SELECT * FROM inventory WHERE sku = ?",
          "span_type": "database",
          "service": "postgres",
          "duration_ms": 45.2,
          "start_time": "2026-09-16T11:59:59.010Z",
          "end_time": "2026-09-16T11:59:59.055Z"
        }
      ],
      "logs": [
        { "level": "INFO", "message": "Order ord_1001 reserved inventory", "timestamp": "2026-09-16T11:59:59.050Z" }
      ]
    }
  ]
}
```
- **Response `202 Accepted`**: `{ "status": "accepted", "processed_count": 1 }`

---

## 4. Metrics & Dashboards (`/api/v1/projects/{project_id}/metrics`)

### `GET /api/v1/projects/{project_id}/metrics/overview`
- **Query Params**: `time_range=1h` (5m, 15m, 1h, 6h, 24h, 7d), `environment=production`, `service=all`
- **Response `200`**:
```json
{
  "summary": {
    "total_requests": 148200,
    "requests_per_second": 41.16,
    "error_rate": 0.012,
    "p50_latency_ms": 38.5,
    "p95_latency_ms": 185.0,
    "p99_latency_ms": 420.0,
    "avg_latency_ms": 52.4
  },
  "series": {
    "timestamps": ["2026-09-16T11:00:00Z", "..."],
    "rps": [38, 42, ...],
    "p95_latency": [180, 192, ...],
    "error_rate": [0.01, 0.015, ...]
  },
  "slowest_endpoints": [
    { "method": "POST", "path": "/v1/checkout", "avg_latency_ms": 820.4, "p95_latency_ms": 1250.0, "call_count": 3400 }
  ],
  "top_error_endpoints": [
    { "method": "POST", "path": "/v1/payments", "error_count": 48, "error_rate": 0.082 }
  ]
}
```

---

## 5. Requests & Traces (`/api/v1/projects/{project_id}/requests` & `traces`)

### `GET /api/v1/projects/{project_id}/requests`
Search & filter requests with pagination, status, method, min_duration, service, search query.

### `GET /api/v1/projects/{project_id}/requests/{request_id}`
Full detailed request payload, timeline breakdown, logs, and spans.

### `GET /api/v1/projects/{project_id}/traces/{trace_id}`
Returns the entire distributed trace tree with hierarchical parent-child spans for waterfall & flame graph rendering.

---

## 6. Logs, Errors, Database & Redis Telemetry

### `GET /api/v1/projects/{project_id}/logs`
Full-text log search with level (DEBUG, INFO, WARN, ERROR, CRITICAL), service, and trace ID filter.

### `GET /api/v1/projects/{project_id}/errors`
Error clustering with fingerprints, exception types, frequency count, and stack traces.

### `GET /api/v1/projects/{project_id}/database`
Database query performance analytics, slow query list, query frequency, and AI explain query.

### `GET /api/v1/projects/{project_id}/redis`
Redis cache statistics: command latencies, hit/miss ratios, key eviction rates.

---

## 7. AI Anomaly & Incident Assistant (`/api/v1/projects/{project_id}/ai`)

### `GET /api/v1/projects/{project_id}/anomalies`
List detected anomalies with severity, confidence score, detected signals, and status.

### `POST /api/v1/projects/{project_id}/anomalies/{anomaly_id}/analyze`
Triggers Google Gemini Root Cause Analysis on the anomaly. Returns structured findings, evidence list, and recommended remediation steps.

### `POST /api/v1/projects/{project_id}/ai/chat`
Interactive incident assistant chat grounded with recent telemetry data.
- **Body**: `{ "question": "Why did checkout latency increase over the last hour?", "context": { ... } }`

---

## 8. OpenAPI Generator (`/api/v1/projects/{project_id}/api-docs`)

### `GET /api/v1/projects/{project_id}/api-docs`
Inferred OpenAPI 3.1 JSON specification synthesized from observed live traffic.

### `GET /api/v1/projects/{project_id}/api-docs/yaml`
OpenAPI 3.1 YAML document download.

---

## 9. Real-Time WebSockets (`/api/v1/ws/projects/{project_id}`)

### `WS /api/v1/ws/projects/{project_id}?token=<jwt>`
Pushes live request events, metric ticks, and anomaly alert notifications in real-time.
