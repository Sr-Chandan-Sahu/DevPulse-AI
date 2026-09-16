from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ApiSchemaDetail(BaseModel):
    id: str
    schema_type: str
    content_type: str
    json_schema: Dict[str, Any] = Field(default_factory=dict)
    example_payload: Any = None
    is_inferred: bool = True

class ApiEndpointResponse(BaseModel):
    id: str
    method: str
    path_pattern: str
    service: str
    summary: str
    description: str
    total_calls_observed: int
    status_codes_observed: List[int] = Field(default_factory=list)
    schemas: List[ApiSchemaDetail] = Field(default_factory=list)

class OpenApiSpecResponse(BaseModel):
    openapi: str = "3.1.0"
    info: Dict[str, Any]
    paths: Dict[str, Any]
    components: Dict[str, Any] = Field(default_factory=dict)
