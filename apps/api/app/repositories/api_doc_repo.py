import json
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.models.api_doc import ApiEndpoint, ApiSchema

class ApiDocRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_endpoints(self, project_id: str) -> List[ApiEndpoint]:
        stmt = (
            select(ApiEndpoint)
            .options(selectinload(ApiEndpoint.schemas))
            .where(ApiEndpoint.project_id == project_id)
            .order_by(ApiEndpoint.path_pattern.asc())
        )
        res = await self.db.execute(stmt)
        return res.scalars().all()

    async def get_or_create_endpoint(
        self,
        project_id: str,
        method: str,
        path_pattern: str,
        service: str = "api-service",
        summary: str = ""
    ) -> ApiEndpoint:
        stmt = (
            select(ApiEndpoint)
            .options(selectinload(ApiEndpoint.schemas))
            .where(
                ApiEndpoint.project_id == project_id,
                ApiEndpoint.method == method.upper(),
                ApiEndpoint.path_pattern == path_pattern
            )
        )
        res = await self.db.execute(stmt)
        endpoint = res.scalar_one_or_none()
        if not endpoint:
            endpoint = ApiEndpoint(
                project_id=project_id,
                method=method.upper(),
                path_pattern=path_pattern,
                service=service,
                summary=summary or f"{method.upper()} {path_pattern}",
                description=f"Auto-inferred endpoint from runtime traffic.",
                total_calls_observed=1,
                status_codes_observed="[200]"
            )
            self.db.add(endpoint)
            await self.db.commit()
            await self.db.refresh(endpoint)
        else:
            endpoint.total_calls_observed += 1
            await self.db.commit()
        return endpoint

    async def save_schema(
        self,
        endpoint_id: str,
        schema_type: str,
        content_type: str,
        json_schema: dict,
        example_payload: any,
        is_inferred: bool = True
    ) -> ApiSchema:
        # Check if schema already exists
        stmt = select(ApiSchema).where(
            ApiSchema.endpoint_id == endpoint_id,
            ApiSchema.schema_type == schema_type
        )
        res = await self.db.execute(stmt)
        schema = res.scalar_one_or_none()
        if not schema:
            schema = ApiSchema(
                endpoint_id=endpoint_id,
                schema_type=schema_type,
                content_type=content_type,
                json_schema=json.dumps(json_schema),
                example_payload=json.dumps(example_payload) if not isinstance(example_payload, str) else example_payload,
                is_inferred=is_inferred
            )
            self.db.add(schema)
        else:
            schema.json_schema = json.dumps(json_schema)
            schema.example_payload = json.dumps(example_payload) if not isinstance(example_payload, str) else example_payload
        
        await self.db.commit()
        await self.db.refresh(schema)
        return schema
