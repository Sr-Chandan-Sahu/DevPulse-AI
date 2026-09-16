# DEV PULSE AI
### API Observability, Telemetry & Anomaly Detection Platform

DEV PULSE AI is a cloud-native developer platform for observing APIs, HTTP traffic, backend latency, database performance, errors, and AI-detected anomalies powered by **Google Gemini**.

![DevPulse AI Hero](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80)

---

## Key Features

- **Real-time Request Telemetry**: Live stream of HTTP requests with latency, status codes, payload sizes, and header inspections.
- **Distributed Tracing & Flame Graphs**: Interactive waterfall timeline and canvas-based flame graph with zoom, pan, and span search.
- **AI Anomaly Root Cause Analysis**: Automated investigation of latency spikes and error waves powered by Google Gemini.
- **Slow Query & Database Analytics**: SQL execution statistics, slow query tracking, and AI index recommendation.
- **Redis Cache Telemetry**: Command latency, hit/miss ratios, and cache efficiency metrics.
- **Automated OpenAPI / Swagger Generator**: Inferred OpenAPI 3.1 specification directly synthesized from live API traffic.
- **Incident Assistant**: Interactive AI chatbot grounded in real-time project telemetry.
- **Multi-Tenancy & RBAC**: Organizations, Projects, Environments, and API key management with strict tenant isolation.
- **Zero-Overhead Python SDK (`devpulse-sdk`)**: Non-blocking client-side batching and automatic PII/secret redaction.

---

## Quick Start

### 1. Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- (Optional) Docker & Docker Compose

### 2. Setup Environment
```bash
cp .env.example .env
# Add your GEMINI_API_KEY in .env
```

### 3. Backend Setup
```bash
cd apps/api
pip install -r requirements.txt
python -m app.main
```
The FastAPI backend runs on `http://localhost:8000` with Swagger UI at `http://localhost:8000/docs`.

### 4. Frontend Setup
```bash
cd apps/web
npm install
npm run dev
```
The Web Console runs on `http://localhost:5173`.

### 5. Seed Demo Data & Traffic Simulator
```bash
python scripts/generate_demo_data.py --continuous
```

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for full system architecture, data models, and caching design.
See [docs/api.md](docs/api.md) for REST & WebSocket API contracts.
See [docs/telemetry.md](docs/telemetry.md) for SDK specifications and PII redaction rules.
See [docs/ai.md](docs/ai.md) for Google Gemini AI integration.
