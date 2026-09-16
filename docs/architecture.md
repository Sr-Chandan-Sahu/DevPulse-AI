# DEV PULSE AI — Architecture & System Design

## 1. System Overview

DEV PULSE AI is a distributed, high-performance API observability, telemetry ingestion, and anomaly detection platform designed for modern microservice and monolithic web applications. It captures HTTP traffic, distributed tracing, database query performance, cache operations, and runtime logs with near-zero overhead.

```
+-------------------------------------------------------------------------+
|                           CLIENT APPLICATIONS                           |
|  (FastAPI, Express, Django, Go Services instrumented with DevPulse SDK) |
+------------------------------------+------------------------------------+
                                     |
                                     | Batched Async JSON / HTTP Ingest
                                     v
+------------------------------------+------------------------------------+
|                         INGESTION GATEWAY                               |
|          FastAPI High-Throughput Endpoint: POST /api/v1/telemetry/ingest |
+------------------------------------+------------------------------------+
                                     |
                                     | Pushes to Ingestion Stream
                                     v
+------------------------------------+------------------------------------+
|                       REDIS BUFFER & PUB/SUB                            |
|             Key namespacing: devpulse:ingest:stream                     |
|                              devpulse:ws:events:{project_id}            |
+-------------------+--------------------------------+--------------------+
                    |                                |
                    | Stream Consumer                | Subscriptions
                    v                                v
+-------------------+--------------------+   +-------+--------------------+
|      BACKGROUND WORKER PIPELINE        |   |    WEBSOCKET REALTIME      |
|  - Telemetry Normalization             |   |         SERVICE            |
|  - Anomaly Rule & Baseline Evaluation  |   | Broadcasts to active UI    |
|  - Aggregation (P50/P95/P99, RPS, Error)|   | dashboards in real time    |
|  - Database Batch Ingestion            |   +----------------------------+
+-------------------+--------------------+
                    |
                    v
+-------------------+--------------------+
|              POSTGRESQL                |
|   - Partitioned Requests & Spans       |
|   - Organizations & Projects           |
|   - Anomalies, Alerts & Inferred APIs  |
+-------------------+--------------------+
                    |
                    v
+-------------------+--------------------+
|       AI INVESTIGATION ENGINE          |
|         Google Gemini 2.5 / Flash      |
|   - Anomaly Root Cause Analysis        |
|   - Slow Query Diagnostics             |
|   - Incident Natural Language Chatbot  |
+----------------------------------------+
```

## 2. Multi-Tenancy Hierarchy

The multi-tenant data model enforces strict cryptographic and relational isolation:

```
Organization (e.g., "Acme Corp", "DevPulse Core")
   └── Organization Member (User + Role: OWNER | ADMIN | MEMBER | VIEWER)
         └── Project (e.g., "E-Commerce Backend", "Auth Service")
               ├── API Keys (e.g., dp_live_...)
               ├── Environments (production, staging, development)
               ├── Services (api-gateway, order-service, payment-service)
               ├── Alert Rules
               ├── Inferred API Schemas
               └── Telemetry Data (Requests, Traces, Spans, Logs, Queries)
```

Every query for telemetry, traces, logs, or metrics scopes queries with `project_id` and checks user project access via RBAC middleware.

## 3. High-Throughput Telemetry Pipeline

1. **Client-side Non-Blocking Middleware**:
   - Captures HTTP method, URL path, headers, query params, status code, duration, memory/CPU metrics.
   - Tracing context creates `trace_id` and nested `span_id` chains.
   - PII and sensitive fields (passwords, tokens, API keys, credit cards) are redacted in-memory using regex & field matchers.
   - Events are buffered in a local thread-safe queue and flushed in batches (every 1s or 50 items) asynchronously.

2. **Ingest Gateway**:
   - `POST /api/v1/telemetry/ingest` validates project API keys via SHA-256 hash lookup in Redis cache.
   - Fast return of `202 Accepted` with batch ID.
   - Enqueues batch directly to Redis stream or local background processing queue.

3. **Aggregation Engine**:
   - Computes rolling percentiles (P50, P95, P99) using sliding window t-digest / sorted sets.
   - Emits real-time metric snapshots over Redis Pub/Sub to active WebSocket connections.

4. **Persistence & Retention**:
   - Raw requests and spans are committed in micro-batches to PostgreSQL.
   - High-cardinality metadata is indexed (status_code, duration_ms, timestamp, service_name, path).

## 4. AI Subsystem (Google Gemini)

The AI engine uses Google Gemini (via `google-generativeai`) to provide deep automated incident response:
- **Anomaly Investigation**: When latency or error rate exceeds 3-sigma or rule thresholds, telemetry context is packaged into structured JSON and investigated by Gemini.
- **Slow Query Diagnostics**: Slow SQL queries are analyzed with table schemas to suggest missing indexes and query refactoring.
- **Incident Assistant**: Chat interface with tool-calling capabilities to query the project's recent telemetry and answer developer questions without hallucinations.
- **Automated OpenAPI Generation**: Inferred request/response payloads are synthesized into standard OpenAPI 3.1 specifications.
