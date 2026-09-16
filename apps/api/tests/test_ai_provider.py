import pytest
from app.ai.providers.gemini import GeminiProvider

@pytest.mark.asyncio
async def test_ai_gemini_fallback_resilience():
    provider = GeminiProvider()
    
    # Test Anomaly Root Cause Analysis
    context = {
        "anomaly_type": "LATENCY_SPIKE",
        "severity": "HIGH",
        "endpoint": "/v1/checkout",
        "service": "checkout-service",
        "metric_value": 1420.0,
        "baseline_value": 110.0,
        "deviation_percent": 1190.9,
        "latency_breakdown": {
            "total_ms": 1420.0,
            "database_ms": 1100.0,
            "cache_ms": 2.0,
            "external_ms": 150.0
        },
        "slow_queries": [
            {"statement": "SELECT * FROM orders WHERE status = 'pending' FOR UPDATE", "avg_ms": 1050.0}
        ]
    }

    rca = await provider.analyze_anomaly(context)
    assert rca is not None
    assert rca.severity in ["HIGH", "CRITICAL"]
    assert "database" in rca.probable_root_cause.lower() or "latency" in rca.summary.lower()
    assert len(rca.evidence) > 0
    assert len(rca.recommended_actions) > 0

    # Test Slow Query Diagnostics
    query_context = {
        "statement": "SELECT * FROM users WHERE email ILIKE '%user%'",
        "table_name": "users",
        "avg_duration_ms": 850.0
    }
    query_diag = await provider.explain_slow_query(query_context)
    assert query_diag is not None
    assert len(query_diag.recommended_indexes) > 0

    # Test Incident Assistant Chat
    chat_resp = await provider.chat_incident_assistant(
        question="Why is checkout latency spiking?",
        telemetry_context={"summary": {"p95_latency_ms": 1420.0, "requests_per_second": 35.0, "error_rate": 0.02}},
        history=[]
    )
    assert len(chat_resp) > 20
