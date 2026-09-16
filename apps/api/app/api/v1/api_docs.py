import json
import yaml
from typing import List
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_project_for_user
from app.db.models.project import Project
from app.repositories.api_doc_repo import ApiDocRepository
from app.services.api_docs.generator import build_openapi_specification
from app.schemas.api_doc import ApiEndpointResponse, ApiSchemaDetail

router = APIRouter(prefix="/projects", tags=["API Documentation Generator"])

@router.get("/{project_id}/api-docs/endpoints", response_model=List[ApiEndpointResponse])
async def list_inferred_endpoints(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = ApiDocRepository(db)
    endpoints = await repo.list_endpoints(project.id)
    responses = []
    for ep in endpoints:
        status_codes = json.loads(ep.status_codes_observed) if ep.status_codes_observed else [200]
        schemas = [
            ApiSchemaDetail(
                id=s.id,
                schema_type=s.schema_type,
                content_type=s.content_type,
                json_schema=json.loads(s.json_schema) if s.json_schema else {},
                example_payload=json.loads(s.example_payload) if s.example_payload.startswith(("{", "[")) else s.example_payload,
                is_inferred=s.is_inferred
            )
            for s in ep.schemas
        ]
        responses.append(
            ApiEndpointResponse(
                id=ep.id,
                method=ep.method,
                path_pattern=ep.path_pattern,
                service=ep.service,
                summary=ep.summary,
                description=ep.description,
                total_calls_observed=ep.total_calls_observed,
                status_codes_observed=status_codes,
                schemas=schemas
            )
        )
    return responses

@router.get("/{project_id}/api-docs/openapi.json")
async def get_openapi_json(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    spec = await build_openapi_specification(project.id, project.name, db)
    return spec

@router.get("/{project_id}/api-docs/openapi.yaml")
async def get_openapi_yaml(
    project_id: str,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    spec = await build_openapi_specification(project.id, project.name, db)
    yaml_str = yaml.dump(spec, sort_keys=False)
    return Response(content=yaml_str, media_type="application/x-yaml", headers={
        "Content-Disposition": f"attachment; filename={project.slug}-openapi.yaml"
    })
