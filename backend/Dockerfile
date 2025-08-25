FROM python:3.12-slim-bookworm

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Java 17 (ok pour Spark 3.x) + utilitaires
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jre-headless curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Définir JAVA_HOME proprement
RUN JAVA_BIN="$(readlink -f "$(which java)")" \
    && JAVA_HOME_CALC="$(dirname "$(dirname "$JAVA_BIN")")" \
    && mkdir -p /usr/lib/jvm \
    && ln -s "$JAVA_HOME_CALC" /usr/lib/jvm/default-java
ENV JAVA_HOME=/usr/lib/jvm/default-java

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir hdfs==2.7.3   # ceinture+bretelles

# Code de l'app
COPY app/ ./app

# Dossier uploads
RUN mkdir -p /tmp/uploads && \
    useradd -m appuser && chown -R appuser:appuser /app /tmp/uploads
USER appuser

EXPOSE 5000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]
