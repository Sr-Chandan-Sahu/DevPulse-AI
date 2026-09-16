import re
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.api_doc import ApiEndpoint, ApiSchema
from app.schemas.telemetry import RequestTelemetryIngest
from app.repositories.api_doc_repo import ApiDocRepository

# Regex to detect IDs in path components (UUIDs, hex strings, mongo IDs, numeric IDs)
ID_PATTERN = re.compile(r"^[0-9]+$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^[a-zA-Z0-9_-]{16,}$|^ord_[a-zA-Z0-9]+$|^usr_[a-zA-Z0-9]+$")

def normalize_path(path: str) -> tuple[str, List[str]]:
    segments = path.strip("/").split("/")
    normalized = []
    path_params = []
    
    for seg in segments:
        if ID_PATTERN.match(seg):
            param_name = "id"
            if "order" in path:
                param_name = "order_id"
            elif "user" in path:
                param_name = "user_id"
            elif "project" in path:
                param_name = "project_id"
            normalized.append(f"{{{param_name}}}")
            path_params.append(param_name)
        else:
            normalized.append(seg)

    return "/" + "/".join(normalized), path_params

def infer_json_schema(data: Any) -> Dict[str, Any]:
    if data is None:
        return {"type": "null"}
    elif isinstance(data, bool):
        return {"type": "boolean"}
    elif isinstance(data, int):
        return {"type": "integer"}
    elif isinstance(data, float):
        return {"type": "number"}
    elif isinstance(data, str):
        return {"type": "string"}
    elif isinstance(data, list):
        if not data:
            return {"type": "array", "items": {}}
        return {
            "type": "array",
            "items": infer_json_schema(data[0])
        }
    elif isinstance(data, dict):
        properties = {}
        required = []
        for k, v in data.items():
            properties[k] = infer_json_schema(v)
            required.append(k)
        return {
            "type": "object",
            "properties": properties,
            "required": required[:5]  # Flag first few as required
        }
    return {"type": "string"}

async def infer_and_save_endpoint_schema(project_id: str, req: RequestTelemetryIngest, db: AsyncSession):
    repo = ApiDocRepository(db)
    pattern, path_params = normalize_path(req.path)

    endpoint = await repo.get_or_create_endpoint(
        project_id=project_id,
        method=req.method,
        path_pattern=pattern,
        service="api-service",
        summary=f"{req.method} {pattern}"
    )

    # 1. Infer Request Body Schema if present
    if req.request_body:
        try:
            req_data = json.loads(req.request_body)
            schema_dict = infer_json_schema(req_data)
            await repo.save_schema(
                endpoint_id=endpoint.id,
                schema_type="request_body",
                content_type="application/json",
                json_schema=schema_dict,
                example_payload=req_data,
                is_inferred=True
            )
        except Exception:
            pass

    # 2. Infer Response Body Schema if present
    if req.response_body:
        try:
            resp_data = json.loads(req.response_body)
            schema_dict = infer_json_schema(resp_data)
            await repo.save_schema(
                endpoint_id=endpoint.id,
                schema_type=f"response_{req.status_code}",
                content_type="application/json",
                json_schema=schema_dict,
                example_payload=resp_data,
                is_inferred=True
            )
        except Exception:
            pass

async def build_openapi_specification(project_id: str, project_name: str, db: AsyncSession) -> Dict[str, Any]:
    repo = ApiDocRepository(db)
    endpoints = await repo.list_endpoints(project_id)

    paths: Dict[str, Any] = {}

    for ep in endpoints:
        if ep.path_pattern not in paths:
            paths[ep.path_pattern] = {}

        method_key = ep.method.lower()
        operation: Dict[str, Any] = {
            "summary": ep.summary or f"{ep.method} {ep.path_pattern}",
            "description": f"{ep.description} (Observed {ep.total_calls_observed} times in live traffic)",
            "tags": [ep.service],
            "parameters": [],
            "responses": {
                "200": {
                    "description": "Successful Response",
                    "content": {
                        "application/json": {
                            "schema": {"type": "object"}
                        }
                    }
                }
            }
        }

        # Extract path parameters
        for param in re.findall(r"\{([a-zA-Z0-9_]+)\}", ep.path_pattern):
            operation["parameters"].append({
                "name": param,
                "in": "path",
                "required": True,
                "schema": {"type": "string"}
            })

        # Attach schemas
        for s in ep.schemas:
            try:
                schema_obj = json.loads(s.json_schema)
                example_obj = json.loads(s.example_payload) if s.example_payload.startswith(("{", "[")) else s.example_payload
            except Exception:
                schema_obj = {"type": "object"}
                example_obj = {}

            if s.schema_type == "request_body":
                operation["requestBody"] = {
                    "description": "Inferred request payload",
                    "required": True,
                    "content": {
                        s.content_type: {
                            "schema": schema_obj,
                            "example": example_obj
                        }
                    }
                }
            elif s.schema_type.startswith("response_"):
                status_code_str = s.schema_type.replace("response_", "")
                operation["responses"][status_code_str] = {
                    "description": f"Status {status_code_str} response",
                    "content": {
                        s.content_type: {
                            "schema": schema_obj,
                            "example": example_obj
                        }
                    }
                }

        paths[ep.path_pattern][method_key] = operation

    return {
        "openapi": "3.1.0",
        "info": {
            "title": f"{project_name} API Documentation",
            "version": "1.0.0",
            "description": "Automated OpenAPI 3.1 specification generated directly from recorded API traffic by DevPulse AI."
        },
        "servers": [
            {"url": "http://localhost:8000", "description": "Local Gateway"}
        ],
        "paths": paths
    }
