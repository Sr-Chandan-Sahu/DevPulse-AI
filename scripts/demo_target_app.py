"""
Demo Target FastAPI Application instrumented with DevPulseMiddleware.
Run this script to simulate an external microservice sending live telemetry to DevPulse AI.
"""

import time
import random
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from devpulse_sdk import DevPulseMiddleware, trace_span, trace_db_query, trace_redis_op

app = FastAPI(title="E-Commerce Target Service")

# Add DevPulse AI Telemetry Middleware
app.add_middleware(
    DevPulseMiddleware,
    api_key="dp_live_demo_key",
    endpoint_url="http://localhost:8000/api/v1/telemetry/ingest",
    environment="production",
    service_name="order-service",
    sampling_rate=1.0
)

class OrderRequest(BaseModel):
    user_id: str
    items: list[dict]
    total_cents: int

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/v1/products")
async def get_products():
    with trace_redis_op("GET", "cache:products:all"):
        time.sleep(0.005)

    with trace_db_query("SELECT * FROM products WHERE is_active = true LIMIT 50"):
        time.sleep(0.025)

    return [{"id": "prod_1", "name": "Cloud Server Instance", "price": 4999}]

@app.post("/v1/orders", status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderRequest):
    # 1. Custom span for inventory validation
    with trace_span("validate_inventory", span_type="custom", service="inventory-module"):
        time.sleep(0.015)

    # 2. Database span for order insertion
    with trace_db_query("INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id"):
        time.sleep(0.045)

    # 3. Cache span for session update
    with trace_redis_op("SETEX", f"order:session:{order.user_id}"):
        time.sleep(0.003)

    return {"order_id": "ord_88412", "status": "created"}

@app.post("/v1/checkout/process")
async def process_checkout():
    # Simulate database lock contention
    with trace_db_query("SELECT * FROM orders WHERE status = 'pending' FOR UPDATE"):
        time.sleep(0.85)

    return {"status": "success", "message": "Checkout completed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("demo_target_app:app", host="127.0.0.1", port=8080, reload=True)
