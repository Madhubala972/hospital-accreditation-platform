#!/bin/bash
set -e

echo "=================================================="
echo "🏥 Launching CN Hospital Intelligence System (24/7)"
echo "=================================================="

# 1. Start MongoDB (embedded if no external MONGO_URI specified)
if [ -z "$MONGO_URI" ]; then
    echo "[1/4] Starting internal MongoDB daemon on 127.0.0.1:27017..."
    mongod --dbpath /data/db --bind_ip 127.0.0.1 --logpath /tmp/logs/mongod.log --fork || {
        echo "Fallback: starting mongod directly in background..."
        mongod --dbpath /data/db --bind_ip 127.0.0.1 --logpath /tmp/logs/mongod.log &
    }
    sleep 3

    echo "[2/4] Seeding initial hospital database..."
    node /app/database/seed/seed.js || true
else
    echo "[1/4] Using external MongoDB URI: $MONGO_URI"
    echo "[2/4] Ensuring database is seeded..."
    node /app/database/seed/seed.js || true
fi

# 2. Launch Python AI Microservice (PM4Py, SimPy, Anomaly Detection)
echo "[3/4] Launching Python AI Microservice on port 5001..."
cd /app/ai-service
python3 app.py &
sleep 2

# 3. Launch Node.js Backend & Serve Frontend Bundle on Port 7860 (Hugging Face Default)
echo "[4/4] Starting Node.js Backend & Frontend on Port 7860..."
cd /app/backend
export PORT=7860
exec node server.js
