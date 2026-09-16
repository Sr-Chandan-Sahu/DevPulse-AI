from typing import Optional, List
import datetime
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class EnvironmentResponse(BaseModel):
    id: str
    name: str

class ServiceResponse(BaseModel):
    id: str
    name: str

class ApiKeyCreate(BaseModel):
    name: str
    environment: str = "production"

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    environment: str
    is_active: bool
    created_at: datetime.datetime
    raw_key: Optional[str] = None  # Populated only on creation

class ProjectResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    slug: str
    description: str
    created_at: datetime.datetime
    environments: List[EnvironmentResponse] = Field(default_factory=list)
    services: List[ServiceResponse] = Field(default_factory=list)
