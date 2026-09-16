import time
import uuid
import json
import datetime
import random
import traceback
from typing import Optional, Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .models import RequestTelemetryPayload, SpanPayload
from .redaction import RedactionEngine
from .tracing import current_trace_id, current_parent_span_id, current_request_spans
from .batching import BackgroundBatcher
from .client import DevPulseClient

class DevPulseMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        api_key: str,
        endpoint_url: str = "http://localhost:8000/api/v1/telemetry/ingest",
        environment: str = "production",
        service_name: str = "api-service",
        sampling_rate: float = 1.0,
        sample_all_errors: bool = True,
        slow_request_threshold_ms: float = 500.0,
        max_body_bytes: int = 32768
    ):
        super().__init__(app)
        self.api_key = api_key
        self.endpoint_url = endpoint_url
        self.environment = environment
        self.service_name = service_name
        self.sampling_rate = sampling_rate
        self.sample_all_errors = sample_all_errors
        self.slow_request_threshold_ms = slow_request_threshold_ms
        self.max_body_bytes = max_body_bytes

        self.client = DevPulseClient(api_key=api_key, endpoint_url=endpoint_url)
        self.batcher = BackgroundBatcher(
            flush_callback=self.client.send_batch,
            environment=environment,
            service=service_name
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_mono = time.monotonic()
        start_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # 1. Trace ID resolution (W3C traceparent or X-Trace-ID or generated)
        incoming_trace = request.headers.get("x-trace-id") or request.headers.get("traceparent")
        trace_id = incoming_trace if incoming_trace else f"trc_{uuid.uuid4().hex[:16]}"
        request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:16]}"
        root_span_id = f"spn_{uuid.uuid4().hex[:16]}"

        token_trace = current_trace_id.set(trace_id)
        token_parent = current_parent_span_id.set(root_span_id)
        spans_collected = []
        token_spans = current_request_spans.set(spans_collected)

        # 2. Extract Request Info
        raw_headers = dict(request.headers)
        sanitized_req_headers = RedactionEngine.redact_headers(raw_headers)
        client_ip = request.client.host if request.client else "127.0.0.1"
        user_agent = raw_headers.get("user-agent", "Unknown")

        # Read Request Body safely
        req_body_str = None
        try:
            body_bytes = await request.body()
            if body_bytes and len(body_bytes) <= self.max_body_bytes:
                req_body_str = RedactionEngine.redact_payload_string(body_bytes.decode("utf-8", errors="ignore"))
        except Exception:
            pass

        # 3. Call downstream application
        status_code = 500
        error_msg = None
        error_type = None
        stack_trace = None
        resp_headers_dict = {}
        resp_body_str = None

        try:
            response = await call_next(request)
            status_code = response.status_code
            resp_headers_dict = RedactionEngine.redact_headers(dict(response.headers))
            
            # Append correlation header to outgoing response
            response.headers["X-Trace-ID"] = trace_id
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            status_code = 500
            error_msg = str(exc)
            error_type = exc.__class__.__name__
            stack_trace = traceback.format_exc()
            raise exc
        finally:
            duration_ms = round((time.monotonic() - start_mono) * 1000, 2)
            end_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

            # Create Root HTTP Span
            root_span = SpanPayload(
                span_id=root_span_id,
                parent_span_id=None,
                name=f"{request.method} {request.url.path}",
                span_type="http",
                service=self.service_name,
                duration_ms=duration_ms,
                start_time=start_time_iso,
                end_time=end_time_iso,
                attributes={
                    "http.method": request.method,
                    "http.url": str(request.url),
                    "http.status_code": status_code,
                    "http.route": request.scope.get("root_path", "") + request.url.path
                }
            )

            all_spans = [root_span] + spans_collected

            # Sum durations of sub-spans by type
            db_duration = sum(s.duration_ms for s in spans_collected if s.span_type == "database")
            cache_duration = sum(s.duration_ms for s in spans_collected if s.span_type == "cache")
            ext_duration = sum(s.duration_ms for s in spans_collected if s.span_type == "external")

            # 4. Sampling Decision
            should_sample = False
            if self.sample_all_errors and status_code >= 400:
                should_sample = True
            elif duration_ms >= self.slow_request_threshold_ms:
                should_sample = True
            elif self.sampling_rate >= 1.0 or random.random() < self.sampling_rate:
                should_sample = True

            if should_sample:
                telemetry = RequestTelemetryPayload(
                    request_id=request_id,
                    trace_id=trace_id,
                    timestamp=start_time_iso,
                    method=request.method,
                    url=str(request.url),
                    path=request.url.path,
                    route=request.url.path,
                    status_code=status_code,
                    duration_ms=duration_ms,
                    client_ip=client_ip,
                    user_agent=user_agent,
                    request_headers=sanitized_req_headers,
                    request_body=req_body_str,
                    response_headers=resp_headers_dict,
                    response_body=resp_body_str,
                    database_duration_ms=round(db_duration, 2),
                    cache_duration_ms=round(cache_duration, 2),
                    external_duration_ms=round(ext_duration, 2),
                    error_message=error_msg,
                    error_type=error_type,
                    stack_trace=stack_trace,
                    spans=all_spans,
                    logs=[]
                )
                self.batcher.enqueue(telemetry)

            # Reset context
            current_trace_id.reset(token_trace)
            current_parent_span_id.reset(token_parent)
            current_request_spans.reset(token_spans)
