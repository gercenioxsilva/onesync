ARG REGISTRY_PREFIX=mirror.gcr.io/library/
FROM ${REGISTRY_PREFIX}python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic ./alembic
COPY alembic.ini .
COPY app ./app
COPY startup.sh .
RUN chmod +x startup.sh

EXPOSE 8000

CMD ["./startup.sh"]