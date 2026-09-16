import datetime
from sqlalchemy import String, Float, Boolean, Text, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid

class AlertRule(Base, TimestampMixin):
    __tablename__ = "alert_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_type: Mapped[str] = mapped_column(String(64), nullable=False)  # LATENCY_P95, ERROR_RATE, 5XX_COUNT, DB_SLOW_QUERY
    operator: Mapped[str] = mapped_column(String(8), default=">", nullable=False)  # >, <, >=, <=
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    duration_window_minutes: Mapped[int] = mapped_column(Float, default=5, nullable=False)
    
    service_filter: Mapped[str] = mapped_column(String(128), default="all", nullable=False)
    endpoint_filter: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_channel: Mapped[str] = mapped_column(String(64), default="in_app", nullable=False)  # in_app, webhook, slack

    # Relationships
    project = relationship("Project", back_populates="alerts")
    events = relationship("AlertEvent", back_populates="rule", cascade="all, delete-orphan")

class AlertEvent(Base, TimestampMixin):
    __tablename__ = "alert_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    alert_rule_id: Mapped[str] = mapped_column(String(36), ForeignKey("alert_rules.id", ondelete="CASCADE"), index=True, nullable=False)
    
    triggered_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    resolved_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    threshold_value: Mapped[float] = mapped_column(Float, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="TRIGGERED", index=True, nullable=False)  # TRIGGERED, RESOLVED, ACKNOWLEDGED

    rule = relationship("AlertRule", back_populates="events")
