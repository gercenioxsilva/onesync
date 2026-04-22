from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import (
    create_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)
from app.core.database import get_db
from app.slices.auth.api.schemas import (
    GoogleLoginRequest,
    LoginRequest,
    LoginResponse,
    RegisterTenantRequest,
    TenantRegistrationResponse,
)
from app.slices.tenants.infrastructure.models import TenantModel
from app.slices.users.infrastructure.models import UserModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = (payload.email or payload.username or "").strip().lower()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe email ou username",
        )

    user = db.scalar(
        select(UserModel).where((UserModel.email == identifier) & (UserModel.is_active.is_(True)))
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha inválidos",
        )

    token = create_access_token(user.id, user.tenant_id, user.role, user.email)
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        email=user.email,
    )


@router.post("/google", response_model=LoginResponse)
def login_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    google_payload = verify_google_id_token(payload.id_token)
    email = str(google_payload.get("email", "")).strip().lower()
    google_sub = str(google_payload.get("sub", "")).strip()
    name = str(google_payload.get("name", "Usuário Google")).strip()

    if not email or not google_sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token do Google sem dados mínimos",
        )

    if payload.tenant_cnpj:
        tenant = db.scalar(
            select(TenantModel).where(
                (TenantModel.cnpj == payload.tenant_cnpj) & (TenantModel.is_active.is_(True))
            )
        )
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "tenant_not_found", "email": email, "name": name},
            )
        user = db.scalar(
            select(UserModel).where(
                (UserModel.tenant_id == tenant.id)
                & ((UserModel.google_sub == google_sub) | (UserModel.email == email))
            )
        )
        if not user:
            user = UserModel(
                tenant_id=tenant.id,
                full_name=name,
                email=email,
                google_sub=google_sub,
                role="MEMBER",
                password_hash="",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        user = db.scalar(select(UserModel).where(UserModel.google_sub == google_sub))
        if not user:
            user = db.scalar(
                select(UserModel).where(
                    (UserModel.email == email) & (UserModel.is_active.is_(True))
                )
            )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "tenant_not_found", "email": email, "name": name},
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado",
        )

    changed = False
    if user.google_sub != google_sub:
        user.google_sub = google_sub
        changed = True
    if user.full_name != name:
        user.full_name = name
        changed = True
    if changed:
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.tenant_id, user.role, user.email)
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=user.role,
        email=user.email,
    )


@router.post("/register-tenant", response_model=TenantRegistrationResponse, status_code=201)
def register_tenant(payload: RegisterTenantRequest, db: Session = Depends(get_db)):
    existing_tenant = db.scalar(select(TenantModel).where(TenantModel.cnpj == payload.cnpj))
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CNPJ já cadastrado",
        )

    tenant = TenantModel(
        name=payload.company_name.strip(),
        cnpj=payload.cnpj.strip(),
        email=payload.email.strip().lower(),
        address=payload.address.strip(),
        phone=payload.phone.strip(),
        collaborator_quota=payload.collaborator_quota,
        plan_type=payload.plan_type,
    )
    db.add(tenant)
    db.flush()

    owner = UserModel(
        tenant_id=tenant.id,
        full_name=payload.owner_name.strip(),
        email=payload.owner_email.strip().lower(),
        password_hash=hash_password(payload.owner_password),
        role="OWNER",
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)

    return TenantRegistrationResponse(
        tenant_id=tenant.id,
        owner_user_id=owner.id,
        plan_type=tenant.plan_type,
    )
