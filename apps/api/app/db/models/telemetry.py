import datetime
from sqlalchemy import String, Integer, Float, Text, ForeignKey, Index, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid

class RequestRecord(Base, TimestampMixin):
    __tablename__ = "requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    trace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    environment: Mapped[str] = mapped_column(String(64), default="production", index=True, nullable=False)
    service: Mapped[str] = mapped_column(String(128), default="api-service", index=True, nullable=False)
    
    method: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    path: Mapped[str] = mapped_column(String(512), index=True, nullable=False)
    route: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    
    duration_ms: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    database_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cache_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    external_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    client_ip: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    user_agent: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    
    request_headers: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    request_body: Mapped[str] = mapped_column(Text, default="", nullable=True)
    response_headers: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    response_body: Mapped[str] = mapped_column(Text, default="", nullable=True)
    
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    error_type: Mapped[str] = mapped_column(String(255), nullable=True)
    stack_trace: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="requests")
    spans = relationship("SpanRecord", back_populates="request", cascade="all, delete-orphan")
    logs = relationship("LogRecord", back_populates="request", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_req_proj_time", "project_id", "timestamp"),
        Index("idx_req_proj_status", "project_id", "status_code"),
        Index("idx_req_proj_path", "project_id", "path"),
        Index("idx_req_proj_duration", "project_id", "duration_ms"),
    )

class SpanRecord(Base, TimestampMixin):
    __tablename__ = "spans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    request_record_id: Mapped[str] = mapped_column(String(36), ForeignKey("requests.id", ondelete="CASCADE"), index=True, nullable=True)
    
    span_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    parent_span_id: Mapped[str] = mapped_column(String(64), nullable=True)
    trace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    span_type: Mapped[str] = mapped_column(String(32), default="custom", index=True, nullable=False)  # http, database, cache, external, custom
    service: Mapped[str] = mapped_column(String(128), default="api-service", index=True, nullable=False)
    
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False)
    start_time: Mapped[str] = mapped_column(String(64), nullable=False)
    end_time: Mapped[str] = mapped_column(String(64), nullable=False)
    
    attributes_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    request = relationship("RequestRecord", back_populates="spans")

    __table_args__ = (
        Index("idx_span_proj_trace", "project_id", "trace_id"),
    )

class LogRecord(Base, TimestampMixin):
    __tablename__ = "logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    request_record_id: Mapped[str] = mapped_column(String(36), ForeignKey("requests.id", ondelete="CASCADE"), index=True, nullable=True)
    
    trace_id: Mapped[str] = mapped_column(String(64), index=True, nullable=True)
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=True)
    
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    level: Mapped[str] = mapped_column(String(16), index=True, nullable=False)  # DEBUG, INFO, WARN, ERROR, CRITICAL
    service: Mapped[str] = mapped_column(String(128), default="api-service", index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    context_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    request = relationship("RequestRecord", back_populates="logs")

class ErrorRecord(Base, TimestampMixin):
    __tablename__ = "errors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    fingerprint: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    error_type: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=False)
    service: Mapped[str] = mapped_column(String(128), default="api-service", nullable=False)
    endpoint: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    first_seen: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    
    sample_trace_id: Mapped[str] = mapped_column(String(64), nullable=True)
    sample_request_id: Mapped[str] = mapped_column(String(64), nullable=True)
    sample_stack_trace: Mapped[str] = mapped_column(Text, nullable=True)

class DatabaseQueryRecord(Base, TimestampMixin):
    __tablename__ = "database_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    query_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    table_name: Mapped[str] = mapped_column(String(128), default="unknown", index=True, nullable=False)
    operation: Mapped[str] = mapped_column(String(32), default="SELECT", nullable=False)  # SELECT, INSERT, UPDATE, DELETE
    
    avg_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    call_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    slow_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_seen: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)

class RedisOperationRecord(Base, TimestampMixin):
    __tablename__ = "redis_operations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    command: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # GET, SET, HGET, LPUSH, etc.
    key_pattern: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    
    avg_duration_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    call_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_seen: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
