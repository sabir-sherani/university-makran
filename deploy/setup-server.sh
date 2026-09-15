#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time server preparation for a fresh Hostinger VPS (Ubuntu 24.04).
# Run once, as root:
#
#   bash deploy/setup-server.sh
#
# Installs Node 20, Nginx, PM2, Certbot and a firewall, and adds swap on
# small plans. Safe to re-run — every step checks before acting.
# ---------------------------------------------------------------------------
set -euo pipefail

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m !  %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root:  sudo bash deploy/setup-server.sh" >&2
  exit 1
fi

log "Updating packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

log "Installing base tools"
apt-get install -y curl git ufw nginx rsync ca-certificates gnupg gettext-base

# --- Swap ------------------------------------------------------------------
# `next build` is memory hungry; two Next apps on a 4GB box will OOM-kill the
# build without swap. Skipped when swap already exists or RAM is ample.
TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
if [[ "$SWAP_MB" -lt 1024 && "$TOTAL_MB" -lt 8000 ]]; then
  log "Adding 2GB swap (RAM is ${TOTAL_MB}MB, no swap configured)"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "Swap check: ${SWAP_MB}MB swap, ${TOTAL_MB}MB RAM — no change needed"
fi

# --- Node 20 ---------------------------------------------------------------
# Next 14 and Mongoose 7 both want Node 18+. Ubuntu's own repo ships an older
# Node, so use NodeSource.
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2-3)" -lt 18 ]]; then
  log "Installing Node.js 20 from NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  log "Node already present: $(node -v)"
fi

# --- PM2 -------------------------------------------------------------------
if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2"
  npm install -g pm2
else
  log "PM2 already present: $(pm2 -v)"
fi

# --- Certbot ---------------------------------------------------------------
log "Installing Certbot"
apt-get install -y certbot python3-certbot-nginx

# --- Firewall --------------------------------------------------------------
# SSH is allowed FIRST so enabling ufw cannot lock you out. The app ports
# (3000/3001/5000) stay closed on purpose — only Nginx talks to them, over
# loopback.
log "Configuring firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status verbose

# --- Directories -----------------------------------------------------------
log "Creating directories"
mkdir -p /var/log/ump
mkdir -p /var/www

log "Server preparation complete"
cat <<'NEXT'

Next steps:
  1. Clone the repo into /var/www/university-makran
  2. cp deploy/deploy.env.example deploy/deploy.env   and fill it in
  3. Create the three env files (see deploy/env/*.example)
  4. bash deploy/render-nginx.sh
  5. bash deploy/deploy.sh
  6. certbot --nginx

NEXT
