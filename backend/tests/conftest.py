import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure app package is resolvable when pytest runs from /app
APP_ROOT = Path(__file__).resolve().parent.parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

# Force-set env vars BEFORE any app module is imported
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AUTH_BOOTSTRAP_ENABLED"] = "false"
os.environ["ENABLE_SCHEMA_AUTOCREATE"] = "false"
os.environ["GOOGLE_CLIENT_ID"] = "test-google-client-id"
os.environ["AUTH_SECRET_KEY"] = "test-secret-key-for-pytest"

# Clear any already-loaded app cached modules so settings re-reads env vars
for mod_name in list(sys.modules.keys()):
    if mod_name.startswith("app"):
        del sys.modules[mod_name]

from app.core.auth import hash_password
from app.core.database import Base, get_db
from app.main import app
from app.slices.tenants.infrastructure.models import TenantModel
from app.slices.users.infrastructure.models import UserModel

# In-memory SQLite engine shared across all threads via StaticPool
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture()
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seed_owner(db_session):
    tenant = TenantModel(
        name="Empresa Teste",
        cnpj="12345678000190",
        email="contato@teste.com",
        address="Rua Teste, 123",
        phone="+55 11 99999-0000",
        collaborator_quota=25,
        plan_type="FREE",
    )
    db_session.add(tenant)
    db_session.flush()

    owner = UserModel(
        tenant_id=tenant.id,
        full_name="Owner Teste",
        email="owner@teste.com",
        password_hash=hash_password("admin123"),
        role="OWNER",
        is_active=True,
    )
    admin = UserModel(
        tenant_id=tenant.id,
        full_name="Admin Teste",
        email="admin@teste.com",
        password_hash=hash_password("admin123"),
        role="ADMIN",
        is_active=True,
    )
    member = UserModel(
        tenant_id=tenant.id,
        full_name="Member Teste",
        email="member@teste.com",
        password_hash=hash_password("admin123"),
        role="MEMBER",
        is_active=True,
    )
    db_session.add_all([owner, admin, member])
    db_session.commit()
    db_session.refresh(tenant)
    db_session.refresh(owner)
    db_session.refresh(admin)
    db_session.refresh(member)

    return {
        "tenant": tenant,
        "owner": owner,
        "admin": admin,
        "member": member,
    }


@pytest.fixture()
def auth_headers(client, seed_owner):
    def _login(email="owner@teste.com", password="admin123"):
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert response.status_code == 200, response.text
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _login


@pytest.fixture()
def collaborator_payload():
    return {
        "name": "João Silva",
        "email": "joao@empresa.com",
        "squad": "Plataforma",
        "tech_lead_id": None,
        "role": "Software Engineer",
        "focus": "Evoluir arquitetura",
    }
