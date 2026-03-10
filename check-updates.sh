#!/bin/bash

# ====================================================
# Skyvault Github Polling Script
# This runs via Cron to check for updates silently.
# If changes are found, it triggers auto-deploy.sh.
# ====================================================

# Navigate to project directory (change if necessary)
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin
cd "$(dirname "$0")"

# Load environment variables if they exist
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Fetch the latest from remote
git fetch origin main

# Check if we are behind origin/main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): Updates found! Triggering auto-deploy..."
    
    # Send a quick "Update started" message before deploying
    if [ ! -z "$BOT_TOKEN" ] && [ ! -z "$CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
             -d chat_id="${CHAT_ID}" \
             -d text="🔄 GitHub Updates detected! Auto-deploying Skyvault..."
    fi

    # Trigger the main deployment script explicitly with bash
    /bin/bash ./auto-deploy.sh
else
    # No updates, do nothing
    echo "$(date): Up to date."
fi
