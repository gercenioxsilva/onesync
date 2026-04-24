#!/bin/sh
set -e

echo "=== Checking DB migration state ==="
python3 - <<'PYEOF'
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    av = conn.execute(text("SELECT to_regclass('public.alembic_version')")).scalar()
    if av is None:
        u = conn.execute(text("SELECT to_regclass('public.users')")).scalar()
        if u is not None:
            print("[startup] Existing DB without alembic — stamping to 0004_actions")
            conn.execute(text(
                "CREATE TABLE IF NOT EXISTS alembic_version "
                "(version_num VARCHAR(32) NOT NULL PRIMARY KEY)"
            ))
            conn.execute(text(
                "INSERT INTO alembic_version (version_num) "
                "VALUES ('0004_actions') ON CONFLICT DO NOTHING"
            ))
            conn.commit()
        else:
            print("[startup] Fresh DB — alembic will run all migrations")
    else:
        print("[startup] alembic_version found — applying pending migrations only")
PYEOF

echo "=== Running alembic upgrade head ==="
alembic upgrade head

echo "=== Starting uvicorn ==="
exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
