from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.user import User
from app.db.models.organization import Organization, OrganizationMember, OrgRole
from app.core.security import get_password_hash

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = (
            select(User)
            .options(
                selectinload(User.memberships).selectinload(OrganizationMember.organization)
            )
            .where(User.email == email.lower())
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = (
            select(User)
            .options(
                selectinload(User.memberships).selectinload(OrganizationMember.organization)
            )
            .where(User.id == user_id)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_user_with_org(
        self,
        email: str,
        password: str,
        full_name: str,
        org_name: Optional[str] = None
    ) -> User:
        user = User(
            email=email.lower(),
            hashed_password=get_password_hash(password),
            full_name=full_name,
            is_active=True
        )
        self.db.add(user)
        await self.db.flush()

        organization_name = org_name or f"{full_name.split()[0]}'s Org"
        slug = organization_name.lower().replace(" ", "-") + f"-{user.id[:4]}"
        org = Organization(name=organization_name, slug=slug)
        self.db.add(org)
        await self.db.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role=OrgRole.OWNER
        )
        self.db.add(member)
        await self.db.commit()
        return await self.get_by_id(user.id)
