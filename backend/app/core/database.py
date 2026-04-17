from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


# PostgreSQL engine configuration with connection pooling
if settings.database_url.startswith("postgresql"):
    engine = create_engine(
        settings.database_url,
        future=True,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Test connections before using them
    )
else:
    # SQLite configuration (for backward compatibility)
    engine = create_engine(settings.database_url, future=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
