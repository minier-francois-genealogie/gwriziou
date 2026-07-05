# API généalogie — FastAPI + SQLite (index dérivé, données sur GitHub)
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AUTO_IMPORT=true \
    SQLITE_PATH=/data/genealogie.sqlite

COPY server/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY paths.py .
COPY server/ ./server/
COPY bdd/schema.sql ./bdd/schema.sql
COPY bdd/scripts/ ./bdd/scripts/
COPY scripts/ ./scripts/

RUN mkdir -p /data

EXPOSE 8000

# Render injecte PORT ; local : 8000 par défaut
CMD ["sh", "-c", "uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
