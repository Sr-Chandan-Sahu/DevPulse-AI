import time
import uuid
import contextvars
from typing import Optional, List, Dict, Any
from .models import SpanPayload

# Context variables for trace propagation
current_trace_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_trace_id", default=None)
current_parent_span_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_parent_span_id", default=None)
current_request_spans: contextvars.ContextVar[List[SpanPayload]] = contextvars.ContextVar("current_request_spans", default=[])

def generate_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}"

class SpanContext:
    def __init__(self, name: str, span_type: str = "custom", service: str = "app", attributes: Optional[Dict[str, Any]] = None):
        self.span_id = generate_id("spn_")
        self.name = name
        self.span_type = span_type
        self.service = service
        self.attributes = attributes or {}
        self.start_time_iso = ""
        self.start_time_mono = 0.0
        self.token_parent = None

    def __enter__(self):
        self.start_time_mono = time.monotonic()
        import datetime
        self.start_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Save existing parent
        parent = current_parent_span_id.get()
        self.parent_id = parent
        
        # Set self as new parent for children
        self.token_parent = current_parent_span_id.set(self.span_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = round((time.monotonic() - self.start_time_mono) * 1000, 2)
        import datetime
        end_time_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        if exc_type:
            self.attributes["error"] = True
            self.attributes["error.type"] = str(exc_type.__name__)
            self.attributes["error.message"] = str(exc_val)

        span = SpanPayload(
            span_id=self.span_id,
            parent_span_id=self.parent_id,
            name=self.name,
            span_type=self.span_type,
            service=self.service,
            duration_ms=duration_ms,
            start_time=self.start_time_iso,
            end_time=end_time_iso,
            attributes=self.attributes
        )
        
        try:
            spans_list = current_request_spans.get()
            spans_list.append(span)
        except Exception:
            pass

        if self.token_parent:
            current_parent_span_id.reset(self.token_parent)

def trace_span(name: str, span_type: str = "custom", service: str = "app", attributes: Optional[Dict[str, Any]] = None):
    """Context manager for instrumenting code blocks."""
    return SpanContext(name=name, span_type=span_type, service=service, attributes=attributes)

def trace_db_query(query: str, service: str = "postgres", params: Optional[Dict[str, Any]] = None):
    """Convenience helper for database spans."""
    attrs = {"db.statement": query}
    if params:
        attrs["db.params"] = params
    return SpanContext(name=query[:80], span_type="database", service=service, attributes=attrs)

def trace_redis_op(command: str, key: str, service: str = "redis"):
    """Convenience helper for Redis cache spans."""
    return SpanContext(name=f"{command.upper()} {key}", span_type="cache", service=service, attributes={"redis.command": command, "redis.key": key})
