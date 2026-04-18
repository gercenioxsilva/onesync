from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, get_current_user, hash_password, require_roles
from app.core.database import get_db
from app.slices.users.api.schemas import InviteUserRequest, UpdateUserRoleRequest, UserOut
from app.slices.users.infrastructure.models import UserModel

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def get_me(
    current_user: AuthContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalar(select(UserModel).where(UserModel.id == current_user.user_id))


@router.get("", response_model=list[UserOut])
def list_users(
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    query = select(UserModel).where(UserModel.tenant_id == current_user.tenant_id)
    return list(db.scalars(query.order_by(UserModel.full_name)).all())


@router.post("", response_model=UserOut, status_code=201)
def invite_user(
    payload: InviteUserRequest,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(UserModel).where(
            (UserModel.tenant_id == current_user.tenant_id)
            & (UserModel.email == payload.email.strip().lower())
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email já cadastrado neste tenant")

    user = UserModel(
        tenant_id=current_user.tenant_id,
        full_name=payload.full_name.strip(),
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: str,
    payload: UpdateUserRoleRequest,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(UserModel).where(
            (UserModel.id == user_id)
            & (UserModel.tenant_id == current_user.tenant_id)
        )
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.role == "OWNER":
        raise HTTPException(status_code=403, detail="Role do owner não pode ser alterado")
    if user.id == current_user.user_id:
        raise HTTPException(status_code=403, detail="Você não pode alterar o seu próprio role")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: str,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(UserModel).where(
            (UserModel.id == user_id)
            & (UserModel.tenant_id == current_user.tenant_id)
        )
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.role == "OWNER":
        raise HTTPException(status_code=403, detail="Owner não pode ser desativado")
    if user.id == current_user.user_id:
        raise HTTPException(status_code=403, detail="Você não pode se desativar")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: str,
    current_user: AuthContext = Depends(require_roles("OWNER", "ADMIN")),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(UserModel).where(
            (UserModel.id == user_id)
            & (UserModel.tenant_id == current_user.tenant_id)
        )
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    current_user: AuthContext = Depends(require_roles("OWNER")),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(UserModel).where(
            (UserModel.id == user_id)
            & (UserModel.tenant_id == current_user.tenant_id)
        )
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.role == "OWNER":
        raise HTTPException(status_code=403, detail="Owner não pode ser removido")
    if user.id == current_user.user_id:
        raise HTTPException(status_code=403, detail="Você não pode se remover")

    db.delete(user)
    db.commit()
    return Response(status_code=204)
