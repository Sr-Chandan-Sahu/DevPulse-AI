from sqlalchemy import String, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, generate_uuid

class ApiEndpoint(Base, TimestampMixin):
    __tablename__ = "api_endpoints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    path_pattern: Mapped[str] = mapped_column(String(512), nullable=False)  # /v1/orders/{order_id}
    service: Mapped[str] = mapped_column(String(128), default="api-service", nullable=False)
    summary: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    
    total_calls_observed: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status_codes_observed: Mapped[str] = mapped_column(String(255), default="[200]", nullable=False)  # JSON array string

    # Relationships
    project = relationship("Project", back_populates="api_endpoints")
    schemas = relationship("ApiSchema", back_populates="endpoint", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_endpoint_proj_method_path", "project_id", "method", "path_pattern", unique=True),
    )

class ApiSchema(Base, TimestampMixin):
    __tablename__ = "api_schemas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    endpoint_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_endpoints.id", ondelete="CASCADE"), index=True, nullable=False)
    
    schema_type: Mapped[str] = mapped_column(String(32), nullable=False)  # request_body, response_200, response_400, query_params, headers
    content_type: Mapped[str] = mapped_column(String(64), default="application/json", nullable=False)
    json_schema: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    example_payload: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    is_inferred: Mapped[bool] = mapped_column(default=True, nullable=False)

    endpoint = relationship("ApiEndpoint", back_populates="schemas")
