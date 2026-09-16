# DEV PULSE AI — Deployment, Infrastructure & Retention

## 1. Local Development Quickstart

### Prerequisites
- Docker & Docker Compose OR Python 3.10+ & Node.js 18+

### Running with Docker Compose
```bash
# Clone and enter workspace
cd devpulse-ai

# Copy environment file
cp .env.example .env

# Start all services (Postgres, Redis, API, Worker, Web)
docker-compose up -d
```

### Running Locally (Bare Metal)
```bash
# Backend Setup
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m app.main

# Frontend Setup
cd ../../apps/web
npm install
npm run dev
```

---

## 2. Telemetry Retention Strategy

| Data Tier | Retention Window | Storage Target | Strategy |
| :--- | :--- | :--- | :--- |
| Raw Request Payloads & Bodies | 7 Days | PostgreSQL Partitioned | Dropped after 7d to save storage |
| Detailed Distributed Spans | 14 Days | PostgreSQL Partitioned | Compressed indices |
| Aggregated Metrics (P50/P95/P99) | 90 Days | PostgreSQL Time-series Table | Downsampled (1m -> 1h rollups) |
| Anomalies & AI Incident Reports | 365 Days | PostgreSQL Persistent | Full permanent audit history |
| Inferred API Schemas | Permanent | PostgreSQL Versioned | Versioned snapshot history |

---

## 3. High Availability & Scalability
- **API Nodes**: Stateless FastAPI instances behind Nginx or AWS ALB.
- **Worker Nodes**: Horizontal background processors consuming from Redis streams.
- **Database**: PostgreSQL with read replicas for heavy analytics queries.
- **Redis**: Redis Sentinel or AWS ElastiCache cluster with AOF/RDB persistence.
