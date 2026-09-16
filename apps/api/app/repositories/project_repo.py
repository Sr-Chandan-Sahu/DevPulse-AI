from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.project import Project, Environment, Service, ApiKey
from app.db.models.organization import OrganizationMember
from app.core.security import generate_api_key

class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_user(self, user_id: str) -> List[Project]:
        # Fetch orgs where user is a member
        member_stmt = select(OrganizationMember.organization_id).where(OrganizationMember.user_id == user_id)
        member_res = await self.db.execute(member_stmt)
        org_ids = member_res.scalars().all()

        if not org_ids:
            return []

        stmt = (
            select(Project)
            .options(
                selectinload(Project.environments),
                selectinload(Project.services)
            )
            .where(Project.organization_id.in_(org_ids))
            .order_by(Project.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_by_id(self, project_id: str) -> Optional[Project]:
        stmt = (
            select(Project)
            .options(
                selectinload(Project.environments),
                selectinload(Project.services)
            )
            .where(Project.id == project_id)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_project(
        self,
        organization_id: str,
        name: str,
        description: str = ""
    ) -> tuple[Project, str]:
        slug = name.lower().replace(" ", "-")
        project = Project(
            organization_id=organization_id,
            name=name,
            slug=slug,
            description=description
        )
        self.db.add(project)
        await self.db.flush()

        # Create default environments
        for env_name in ["production", "staging", "development"]:
            env = Environment(project_id=project.id, name=env_name)
            self.db.add(env)

        # Create default services
        for srv_name in ["api-gateway", "order-service", "auth-service"]:
            srv = Service(project_id=project.id, name=srv_name)
            self.db.add(srv)

        # Create default initial API Key
        raw_key, key_prefix, key_hash = generate_api_key()
        api_key = ApiKey(
            project_id=project.id,
            name="Default Production Ingestion Key",
            key_prefix=key_prefix,
            key_hash=key_hash,
            environment="production",
            is_active=True
        )
        self.db.add(api_key)
        await self.db.commit()

        created_project = await self.get_by_id(project.id)
        return created_project, raw_key

    async def list_api_keys(self, project_id: str) -> List[ApiKey]:
        stmt = select(ApiKey).where(ApiKey.project_id == project_id).order_by(ApiKey.created_at.desc())
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def create_api_key(self, project_id: str, name: str, environment: str = "production") -> tuple[ApiKey, str]:
        raw_key, key_prefix, key_hash = generate_api_key()
        api_key = ApiKey(
            project_id=project_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            environment=environment,
            is_active=True
        )
        self.db.add(api_key)
        await self.db.commit()
        return api_key, raw_key
