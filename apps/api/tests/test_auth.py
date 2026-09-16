import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register new user
    reg_resp = await client.post("/api/v1/auth/register", json={
        "email": "testuser@devpulse.ai",
        "password": "strongpassword123",
        "full_name": "Test Engineer",
        "organization_name": "Test Engineering Org"
    })
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "user" in data
    assert data["user"]["email"] == "testuser@devpulse.ai"
    assert "tokens" in data
    assert "access_token" in data["tokens"]

    # 2. Login with credentials
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "testuser@devpulse.ai",
        "password": "strongpassword123"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    access_token = token_data["tokens"]["access_token"]
    assert access_token is not None

    # 3. Access Protected /me endpoint
    me_resp = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {access_token}"
    })
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "testuser@devpulse.ai"
    assert len(me_data["organizations"]) > 0
