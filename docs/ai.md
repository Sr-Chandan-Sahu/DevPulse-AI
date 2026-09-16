# DEV PULSE AI — AI Architecture & Google Gemini Integration

## 1. AI Architecture Overview

DEV PULSE AI implements an extensible provider interface (`AIProvider`) with **Google Gemini** as the primary intelligence engine.

```
                  +--------------------------------+
                  |         AIProvider             |
                  |  (Abstract Base Class)         |
                  +---------------+----------------+
                                  |
                                  v
                  +---------------+----------------+
                  |        GeminiProvider          |
                  |   (google-generativeai SDK)    |
                  +---------------+----------------+
                                  |
            +---------------------+---------------------+
            |                     |                     |
            v                     v                     v
+-----------+---------+ +---------+-----------+ +-------+-----------+
| Anomaly Root Cause  | | Slow Query Explainer| | Incident Chatbot  |
| Investigation       | | & Index Advisor     | | (Telemetry RAG)   |
+---------------------+ +---------------------+ +-------------------+
```

---

## 2. Capabilities

### 1. Automated Anomaly Root Cause Analysis
When an anomaly (latency spike, 5xx wave, DB contention) is detected:
1. Grounded telemetry context is collected: affected endpoint, duration breakdown (Network vs. App vs. DB vs. Cache), sample error stack traces, slow queries.
2. Context is sanitized, token-capped, and sent to Gemini with structured JSON output instructions.
3. Output format is strictly validated via Pydantic:
```json
{
  "summary": "Sudden 850ms latency spike in POST /v1/checkout due to unindexed row locks on the orders table.",
  "severity": "CRITICAL",
  "probable_root_cause": "Database connection pool exhaustion and table locking on orders table during concurrent checkout transactions.",
  "confidence_score": 0.94,
  "evidence": [
    "Average database span duration rose from 18ms to 780ms.",
    "Database query 'UPDATE orders SET status = ...' blocked on lock wait.",
    "Spike in 504 Gateway Timeout errors correlating with pool saturation."
  ],
  "recommended_actions": [
    "Add composite index on orders(user_id, status, created_at).",
    "Increase DB connection pool max_size from 20 to 50 in Order Service.",
    "Wrap inventory validation in an optimistic concurrency check."
  ]
}
```

### 2. Slow Query Explainer & Index Advisor
Analyzes slow SQL queries against known table schemas and suggests query optimizations and DDL index statements.

### 3. Incident Assistant (Grounded Chatbot)
Developers can query the observability engine directly:
- *"Why did checkout latency jump at 14:00?"*
- *"Show me all 500 errors related to payment service in the past 30 minutes."*
- *"Which endpoints are consuming the most database time?"*

---

## 3. Resilience & Mock Fallback
In automated test suites or environments where `GEMINI_API_KEY` is not provided, the AI subsystem provides graceful fallback with deterministic mock analyses to avoid breaking the platform.
