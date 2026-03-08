#!/bin/bash

# Exit on error
set -e

echo "==============================================="
echo "  Skyvault Server Deployment Script (Debian)   "
echo "==============================================="

# 1. Start Docker Containers
echo "--> Starting Docker containers..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
elif docker compose version &> /dev/null; then
    docker compose up -d
else
    echo "Error: Docker Compose is not installed."
    exit 1
fi

echo "Docker containers started successfully."

# 2. Check if Cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "--> Installing Cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

# 3. Start Cloudflare Tunnel
echo "--> Starting temporary Cloudflare Tunnel on port 80..."
echo "NOTE: Look for the 'Try Cloudflare' URL in the logs below to access your server."
echo "Press Ctrl+C to stop the tunnel (Docker will keep running in the background)."
echo "-----------------------------------------------"

# Run cloudflared tunnel pointing to the Nginx frontend (port 80)
cloudflared tunnel --url http://localhost:80
