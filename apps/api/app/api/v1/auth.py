from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.repositories.user_repo import UserRepository
from app.schemas.auth import UserCreate, UserLogin, AuthResponse, Token, UserResponse, OrgMembershipResponse
from app.core.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    existing = await repo.get_by_email(user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = await repo.create_user_with_org(
        email=user_in.email,
        password=user_in.password,
        full_name=user_in.full_name,
        org_name=user_in.organization_name
    )

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    orgs = [
        OrgMembershipResponse(
            organization_id=m.organization_id,
            organization_name=m.organization.name if m.organization else "Organization",
            role=m.role.value
        )
        for m in user.memberships
    ]

    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            organizations=orgs
        ),
        tokens=Token(access_token=access_token, refresh_token=refresh_token)
    )

@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    user = await repo.get_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive account")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    orgs = [
        OrgMembershipResponse(
            organization_id=m.organization_id,
            organization_name=m.organization.name if m.organization else "Organization",
            role=m.role.value
        )
        for m in user.memberships
    ]

    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            organizations=orgs
        ),
        tokens=Token(access_token=access_token, refresh_token=refresh_token)
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: dict, db: AsyncSession = Depends(get_db)):
    refresh_token = token_data.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh token")
    
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    new_access = create_access_token({"sub": user_id})
    new_refresh = create_refresh_token({"sub": user_id})
    return Token(access_token=new_access, refresh_token=new_refresh)

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(get_current_user)):
    orgs = [
        OrgMembershipResponse(
            organization_id=m.organization_id,
            organization_name=m.organization.name if m.organization else "Organization",
            role=m.role.value
        )
        for m in user.memberships
    ]
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        organizations=orgs
    )
