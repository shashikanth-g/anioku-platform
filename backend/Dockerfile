FROM python:3.11-slim

WORKDIR /app

# System deps: git (GitPython), build tools (bcrypt/asyncpg native builds), docker CLI is not
# needed here — the backend talks to the host daemon over the mounted socket via docker SDK.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ".[dev]"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
