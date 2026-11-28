#!/usr/bin/env bash
# One-time droplet bootstrap (Ubuntu 22.04/24.04). Run as root on the server.
set -euo pipefail
REPO=${REPO:-https://github.com/FaridPiriyev/futgrid.git}
DIR=/opt/futgrid

# 2 GB swap (builds need it on small droplets)
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Docker
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

# Firewall
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

# Code
[ -d "$DIR/.git" ] && git -C "$DIR" pull --ff-only || git clone "$REPO" "$DIR"
cd "$DIR"

# Secrets (generated once)
if [ ! -f deploy/.env ]; then
  cp deploy/.env.example deploy/.env
  for k in POSTGRES_PASSWORD JWT_ACCESS_SECRET TOKEN_PEPPER IP_HASH_SALT; do
    sed -i "s|^$k=.*|$k=$(openssl rand -hex 32)|" deploy/.env
  done
  chmod 600 deploy/.env
fi

mkdir -p /etc/letsencrypt /var/www/certbot
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
docker compose -f deploy/docker-compose.prod.yml ps

bash "$DIR/deploy/install-auto-deploy.sh"
