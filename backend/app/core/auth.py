from datetime import UTC, datetime, timedelta
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.slices.users.infrastructure.models import UserModel

bearer_scheme = HTTPBearer(auto_error=False)
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthContext:
    def __init__(
        self,
        user_id: str,
        tenant_id: str,
        role: str,
        email: str,
    ):
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.role = role
        self.email = email


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    return password_context.verify(password, password_hash)


def create_access_token(user_id: str, tenant_id: str, role: str, email: str) -> str:
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.auth_access_token_expire_minutes,
    )
    payload = {
        "sub": user_id,
        "tid": tenant_id,
        "role": role,
        "email": email,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm=settings.auth_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.auth_secret_key,
            algorithms=[settings.auth_algorithm],
        )
        return payload
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        ) from exc


def verify_google_id_token(token: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google SSO não configurado no servidor",
        )
    try:
        return google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token do Google inválido",
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória",
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    tenant_id = payload.get("tid")
    role = payload.get("role")
    email = payload.get("email")
    if not user_id or not tenant_id or not role or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user = db.scalar(
        select(UserModel).where(
            (UserModel.id == user_id)
            & (UserModel.tenant_id == tenant_id)
            & (UserModel.is_active.is_(True))
        )
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autorizado",
        )

    if not secrets.compare_digest(user.role, role):
        role = user.role

    return AuthContext(
        user_id=user.id,
        tenant_id=user.tenant_id,
        role=role,
        email=user.email,
    )


def require_roles(*roles: str):
    allowed = {role.upper() for role in roles}

    def _dependency(current_user: AuthContext = Depends(get_current_user)) -> AuthContext:
        if current_user.role.upper() not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente",
            )
        return current_user

    return _dependency
