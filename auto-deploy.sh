#!/bin/bash

# ====================================================
# Skyvault Auto-Deploy & Server Startup Script
# This script is designed to be run manually OR 
# triggered automatically by the Telegram Bot.
# ====================================================

# 1. Update from GitHub
echo "--> [1/4] Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main
# If you are on a different branch, change 'main' to your branch name.

# 2. Build and Start Docker Containers
echo "--> [2/4] Starting Skyvault Docker containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
elif docker compose version &> /dev/null; then
    docker compose up -d --build
else
    echo "Error: Docker Compose is not installed."
    exit 1
fi

# 3. Start Cloudflare Tunnel
echo "--> [3/4] Starting Cloudflare Tunnel..."
# Kill any existing tunnel just in case
pkill -f "cloudflared tunnel" || true

# Start the tunnel in the background and pipe output to a log file
cloudflared tunnel --url http://localhost:80 > cloudflare.log 2>&1 &

# Wait up to 15 seconds for the tunnel to initialize and generate the URL
echo "Waiting for URL generation..."
for i in {1..15}; do
    CLOUDFLARE_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" cloudflare.log | head -1)
    if [ ! -z "$CLOUDFLARE_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$CLOUDFLARE_URL" ]; then
    echo "Failed to get Cloudflare URL. Check cloudflare.log"
    # Send failure to Telegram if BOT_TOKEN is set
    if [ ! -z "$BOT_TOKEN" ] && [ ! -z "$CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
             -d chat_id="${CHAT_ID}" \
             -d text="⚠️ Skyvault deploy failed to get a Cloudflare URL."
    fi
    exit 1
fi

echo "===================================================="
echo " ✅ Skyvault is Live: $CLOUDFLARE_URL"
echo "===================================================="

# 5. Send Notification (If triggered by Cron/Manual, and variables are set)
if [ ! -z "$BOT_TOKEN" ] && [ ! -z "$CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
         -d chat_id="${CHAT_ID}" \
         -d text="🚀 Skyvault Auto-Deploy Complete! Server is Live at: $CLOUDFLARE_URL"
fi
