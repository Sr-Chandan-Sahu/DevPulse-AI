from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user, get_project_for_user
from app.db.models.user import User
from app.db.models.project import Project
from app.repositories.project_repo import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ApiKeyCreate,
    ApiKeyResponse,
    EnvironmentResponse,
    ServiceResponse
)

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_user_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = ProjectRepository(db)
    projects = await repo.list_for_user(user.id)
    return [
        ProjectResponse(
            id=p.id,
            organization_id=p.organization_id,
            name=p.name,
            slug=p.slug,
            description=p.description,
            created_at=p.created_at,
            environments=[EnvironmentResponse(id=e.id, name=e.name) for e in p.environments],
            services=[ServiceResponse(id=s.id, name=s.name) for s in p.services]
        )
        for p in projects
    ]

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not user.memberships:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User has no organization")

    org_id = user.memberships[0].organization_id
    repo = ProjectRepository(db)
    project, _ = await repo.create_project(
        organization_id=org_id,
        name=project_in.name,
        description=project_in.description or ""
    )
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        name=project.name,
        slug=project.slug,
        description=project.description,
        created_at=project.created_at,
        environments=[EnvironmentResponse(id=e.id, name=e.name) for e in project.environments],
        services=[ServiceResponse(id=s.id, name=s.name) for s in project.services]
    )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project: Project = Depends(get_project_for_user)
):
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        name=project.name,
        slug=project.slug,
        description=project.description,
        created_at=project.created_at,
        environments=[EnvironmentResponse(id=e.id, name=e.name) for e in project.environments],
        services=[ServiceResponse(id=s.id, name=s.name) for s in project.services]
    )

@router.get("/{project_id}/api-keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = ProjectRepository(db)
    keys = await repo.list_api_keys(project.id)
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            environment=k.environment,
            is_active=k.is_active,
            created_at=k.created_at
        )
        for k in keys
    ]

@router.post("/{project_id}/api-keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_in: ApiKeyCreate,
    project: Project = Depends(get_project_for_user),
    db: AsyncSession = Depends(get_db)
):
    repo = ProjectRepository(db)
    key_record, raw_key = await repo.create_api_key(
        project_id=project.id,
        name=key_in.name,
        environment=key_in.environment
    )
    return ApiKeyResponse(
        id=key_record.id,
        name=key_record.name,
        key_prefix=key_record.key_prefix,
        environment=key_record.environment,
        is_active=key_record.is_active,
        created_at=key_record.created_at,
        raw_key=raw_key
    )
