# Dockerfile for 24/7 Deployment on Hugging Face Spaces
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=7860
ENV NODE_ENV=production

# Install Node.js 20, Python 3.10+, MongoDB Community, curl, build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    ca-certificates \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    wget \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg \
    && echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list \
    && apt-get update && apt-get install -y mongodb-org \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create persistent DB data path and grant permissions to Hugging Face user (UID 1000)
RUN mkdir -p /data/db /tmp/logs && \
    useradd -m -u 1000 user || true && \
    chown -R 1000:1000 /data/db /tmp/logs /app

# Copy dependency definitions first for optimal layer caching
COPY ai-service/requirements.txt /app/ai-service/requirements.txt
RUN pip3 install --no-cache-dir -r /app/ai-service/requirements.txt

COPY backend/package*.json /app/backend/
RUN cd /app/backend && npm install --production

COPY frontend/package*.json /app/frontend/
RUN cd /app/frontend && npm install

# Copy application source code
COPY . /app

# Build React production bundle
RUN cd /app/frontend && npm run build

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R 1000:1000 /app

USER 1000

EXPOSE 7860

CMD ["/app/docker-entrypoint.sh"]
