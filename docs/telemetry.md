# DEV PULSE AI — Telemetry Specification & SDK Design

## 1. Telemetry Capture Engine

The DevPulse SDK (`packages/devpulse-sdk`) instruments ASGI (FastAPI / Starlette), WSGI (Flask / Django), and custom applications.

### Core Metrics Captured Per Request
- `request_id`: Unique UUID generated or propagated via `X-Request-ID`.
- `trace_id`: Distributed trace ID propagated across services via `traceparent` (W3C standard) or `X-Trace-ID`.
- `duration_ms`: High-precision monotonic millisecond timer ($\pm 0.01\text{ms}$).
- `method`, `path`, `route`, `status_code`: Normalized HTTP metadata.
- `database_duration_ms`: Aggregated execution time across SQL queries.
- `cache_duration_ms`: Aggregated execution time across Redis operations.
- `external_duration_ms`: Aggregated execution time across downstream HTTP / gRPC calls.
- `spans`: Hierarchical list of timed sub-operations with parent-child pointers.
- `logs`: Structured logs emitted during request execution with correlation IDs.

---

## 2. Distributed Tracing & Span Model

Every transaction forms a directed acyclic graph (DAG) of spans:

```
[HTTP POST /api/v1/orders] ──────────────────────── (142ms)
   ├── [Auth Verification] ──────────────────────── (12ms)
   ├── [SELECT * FROM inventory] ────────────────── (45ms)
   ├── [POST https://payments.stripe.com/v1] ────── (80ms)
   └── [SETEX cache:order:1001] ─────────────────── (3ms)
```

### Span Data Structure
```json
{
  "span_id": "spn_8f912e",
  "parent_span_id": "spn_root",
  "trace_id": "trc_4b339f",
  "name": "SELECT * FROM inventory WHERE sku = $1",
  "span_type": "database",
  "service": "postgres-primary",
  "start_time": "2026-09-16T11:59:59.010Z",
  "end_time": "2026-09-16T11:59:59.055Z",
  "duration_ms": 45.0,
  "attributes": {
    "db.system": "postgresql",
    "db.statement": "SELECT * FROM inventory WHERE sku = ?",
    "db.rows_affected": 1
  }
}
```

---

## 3. PII & Secret Redaction Engine

Data protection is executed **on the client-side** before serialization to guarantee zero secret leakage.

### Redaction Rules
1. **Header Stripping**: Keys matching `(?i)(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)` have values replaced with `[REDACTED]`.
2. **Body Key Sanitization**: JSON and Form payload keys matching `(?i)(password|passwd|secret|token|api_key|access_token|private_key|credit_card|cvv|ssn)` are masked to `********`.
3. **Regex Pattern Sanitization**: High-entropy strings, Bearer tokens (`Bearer ey...`), and credit card numbers (`\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b`) are redacted automatically.

---

## 4. Sampling & Buffering Strategy

- **100% Sampling**: Full trace capture for development and staging environments.
- **Adaptive / Percentage Sampling**: E.g., sample 20% of successful 2xx requests.
- **Error-Forced Sampling**: 100% of 4xx and 5xx error requests are guaranteed to be captured regardless of percentage rate.
- **Slow-Request Sampling**: 100% of requests exceeding defined latency threshold (e.g. $> 500\text{ms}$) are captured.
