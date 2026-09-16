import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_project_crud_and_api_keys(client: AsyncClient):
    # Register user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "pm@devpulse.ai",
        "password": "password123",
        "full_name": "Product Manager",
        "organization_name": "DevPulse Corp"
    })
    token = reg.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    proj_resp = await client.post("/api/v1/projects", json={
        "name": "Payments API Microservice",
        "description": "Handles Stripe & PayPal webhooks"
    }, headers=headers)
    assert proj_resp.status_code == 201
    proj_data = proj_resp.json()
    project_id = proj_data["id"]
    assert proj_data["name"] == "Payments API Microservice"
    assert len(proj_data["environments"]) >= 3

    # Create new API Key
    key_resp = await client.post(f"/api/v1/projects/{project_id}/api-keys", json={
        "name": "Staging Key",
        "environment": "staging"
    }, headers=headers)
    assert key_resp.status_code == 201
    key_data = key_resp.json()
    assert "raw_key" in key_data
    assert key_data["raw_key"].startswith("dp_live_")

    # List API Keys
    list_keys = await client.get(f"/api/v1/projects/{project_id}/api-keys", headers=headers)
    assert list_keys.status_code == 200
    assert len(list_keys.json()) >= 2
