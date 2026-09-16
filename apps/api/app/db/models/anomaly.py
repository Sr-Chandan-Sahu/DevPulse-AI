import datetime
from sqlalchemy import String, Float, Text, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid

class AnomalyRecord(Base, TimestampMixin):
    __tablename__ = "anomalies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    anomaly_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # LATENCY_SPIKE, ERROR_SURGE, SLOW_QUERY, CACHE_DROP
    severity: Mapped[str] = mapped_column(String(32), default="MEDIUM", index=True, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE", index=True, nullable=False)  # ACTIVE, INVESTIGATING, RESOLVED, DISMISSED
    
    service: Mapped[str] = mapped_column(String(128), default="api-service", nullable=False)
    endpoint: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    detected_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    resolved_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    metric_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    baseline_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    deviation_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    signals_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    # Relationships
    project = relationship("Project", back_populates="anomalies")
    ai_analysis = relationship("AIAnalysisRecord", back_populates="anomaly", uselist=False, cascade="all, delete-orphan")

class AIAnalysisRecord(Base, TimestampMixin):
    __tablename__ = "ai_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    anomaly_id: Mapped[str] = mapped_column(String(36), ForeignKey("anomalies.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    
    provider: Mapped[str] = mapped_column(String(64), default="gemini", nullable=False)
    model: Mapped[str] = mapped_column(String(64), default="gemini-2.5-flash", nullable=False)
    
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    probable_root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    evidence_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    recommended_actions_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    raw_prompt: Mapped[str] = mapped_column(Text, default="", nullable=False)

    anomaly = relationship("AnomalyRecord", back_populates="ai_analysis")
