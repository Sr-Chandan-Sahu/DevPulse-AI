from typing import Optional, List
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import decode_token, hash_api_key
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.organization import OrganizationMember, OrgRole
from app.db.models.project import Project, ApiKey

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    stmt = (
        select(User)
        .options(
            selectinload(User.memberships).selectinload(OrganizationMember.organization)
        )
        .where(User.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user

async def get_project_for_user(
    project_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Project:
    stmt = (
        select(Project)
        .options(
            selectinload(Project.environments),
            selectinload(Project.services)
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if user.is_superuser:
        return project

    # Check Org Membership
    member_stmt = select(OrganizationMember).where(
        OrganizationMember.organization_id == project.organization_id,
        OrganizationMember.user_id == user.id
    )
    member_res = await db.execute(member_stmt)
    membership = member_res.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project"
        )
    return project

async def verify_ingest_api_key(
    x_devpulse_api_key: Optional[str] = Header(None, alias="X-DevPulse-API-Key"),
    db: AsyncSession = Depends(get_db)
) -> Project:
    if not x_devpulse_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-DevPulse-API-Key header"
        )
    key_hash = hash_api_key(x_devpulse_api_key)
    stmt = select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
    res = await db.execute(stmt)
    api_key_record = res.scalar_one_or_none()
    if not api_key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or deactivated API key"
        )

    project_stmt = (
        select(Project)
        .options(
            selectinload(Project.environments),
            selectinload(Project.services)
        )
        .where(Project.id == api_key_record.project_id)
    )
    project_res = await db.execute(project_stmt)
    project = project_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project for API key not found")
    return project
