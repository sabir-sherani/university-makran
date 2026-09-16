#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# bootstrap.sh — one-shot first deployment on a fresh Hostinger VPS.
#
# Run once, as root, from the cloned repository:
#
#   cd /var/www/university-makran
#   bash deploy/bootstrap.sh
#
# It asks for the two secrets that only you have (the Atlas connection string
# and the Gmail app password), generates everything else, writes all four
# config files, installs the server, builds, starts, and issues certificates.
#
# Safe to re-run: it never overwrites an existing config file without asking,
# and every underlying script is itself idempotent.
#
# Testing hook: DRY_RUN=1 writes the config files into a scratch directory and
# skips every system-level action, so the generation logic can be exercised
# without a server.
# ---------------------------------------------------------------------------
set -euo pipefail

# --- Site layout. Override by exporting before running. --------------------
DOMAIN="${DOMAIN:-new.uomp.edu.pk}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.uomp.edu.pk}"
API_DOMAIN="${API_DOMAIN:-api.uomp.edu.pk}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-info@uomp.edu.pk}"
GMAIL_USER="${GMAIL_USER:-info@uomp.edu.pk}"
GIT_REPO="${GIT_REPO:-https://github.com/sabir-sherani/university-makran.git}"

DRY_RUN="${DRY_RUN:-0}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "$DRY_RUN" == "1" ]] && ROOT="${DRY_ROOT:-/tmp/bootstrap-dry}" && mkdir -p "$ROOT"/{backend,frontend,admin-dashboard,deploy}

step()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info()  { printf '    %s\n' "$*"; }
warn()  { printf '\033[1;33m !  %s\033[0m\n' "$*"; }
fail()  { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    info "[dry-run] would run: $*"
  else
    "$@"
  fi
}

if [[ "$DRY_RUN" != "1" && $EUID -ne 0 ]]; then
  fail "Run as root:  bash deploy/bootstrap.sh"
fi

# Terminals wrap pasted text in bracketed-paste markers (ESC[200~ … ESC[201~).
# They are invisible on screen but bash's `read` hands them to the script as
# part of the value, so a perfectly correct connection string arrives with a
# hidden prefix and fails every check. Windows clipboards add CR as well, and
# people reasonably copy the whole "NAME=value" line rather than just the
# value. Strip all of it rather than making the user fight the terminal.
clean_paste() {
  printf '%s' "$1" \
    | tr -d '\r' \
    | sed -e 's/\x1b\[[0-9?]*[~a-zA-Z]//g' \
          -e 's/^[[:space:]]*//' \
          -e 's/[[:space:]]*$//'
}

# Additionally drops a leading "MONGO_URI=" or bare "=" — only safe for the
# URI, since a password could legitimately begin with uppercase text and "=".
clean_env_value() {
  clean_paste "$1" | sed -e 's/^[A-Za-z_][A-Za-z0-9_]*=//' -e 's/^=//'
}

cat <<BANNER

  University of Makran — first deployment
  ---------------------------------------
  Public site   https://$DOMAIN
  Admin panel   https://$ADMIN_DOMAIN
  API           https://$API_DOMAIN

BANNER

# ---------------------------------------------------------------------------
# 1. Collect the two things only you have
# ---------------------------------------------------------------------------
step "Configuration"

# Written by an earlier run? Offer to keep it rather than asking again.
KEEP_BACKEND_ENV=0
if [[ -f "$ROOT/backend/.env" ]]; then
  warn "backend/.env already exists."
  read -r -p "    Keep it and skip the questions? [Y/n] " ans
  [[ "${ans:-Y}" =~ ^[Nn] ]] || KEEP_BACKEND_ENV=1
fi

if [[ $KEEP_BACKEND_ENV -eq 0 ]]; then
  echo
  info "Paste the MongoDB connection string from backend/.env on your own PC."
  info "It must already contain /university_makran before the '?'."
  echo
  read -r -p "  MONGO_URI: " MONGO_URI
  MONGO_URI="$(clean_env_value "$MONGO_URI")"
  [[ -n "$MONGO_URI" ]] || fail "MONGO_URI cannot be empty."
  case "$MONGO_URI" in
    mongodb://*|mongodb+srv://*) : ;;
    *) fail "That does not look like a connection string — it must start with mongodb:// or mongodb+srv://" ;;
  esac
  if [[ "$MONGO_URI" != *"/university_makran"* ]]; then
    warn "The database name 'university_makran' is not in that string."
    warn "Without it the site will connect but every page will be empty."
    read -r -p "    Continue anyway? [y/N] " ans
    [[ "${ans:-N}" =~ ^[Yy] ]] || fail "Stopped. Copy the exact MONGO_URI line from your working .env."
  fi

  echo
  info "Gmail app password for $GMAIL_USER (input is hidden; paste and press Enter)."
  read -r -s -p "  GMAIL_APP_PASSWORD: " GMAIL_APP_PASSWORD
  echo
  GMAIL_APP_PASSWORD="$(clean_paste "$GMAIL_APP_PASSWORD")"
  if [[ -n "$GMAIL_APP_PASSWORD" ]]; then
    # Shown as a length rather than the value, so a mangled paste is visible
    # without putting the password on screen. A Gmail app password is 16
    # characters, usually pasted with spaces as "abcd efgh ijkl mnop".
    info "Received ${#GMAIL_APP_PASSWORD} characters."
  else
    warn "Left blank — outgoing email will not work until you set it."
  fi
fi

# ---------------------------------------------------------------------------
# 2. Server packages, Node, PM2, Nginx, firewall
# ---------------------------------------------------------------------------
step "Preparing the server"
if [[ "$DRY_RUN" == "1" ]]; then
  info "[dry-run] would run: bash deploy/setup-server.sh"
else
  bash "$ROOT/deploy/setup-server.sh"
fi

# ---------------------------------------------------------------------------
# 3. Write the four config files
# ---------------------------------------------------------------------------
step "Writing configuration"

cat > "$ROOT/deploy/deploy.env" <<EOF
DOMAIN=$DOMAIN
ADMIN_DOMAIN=$ADMIN_DOMAIN
API_DOMAIN=$API_DOMAIN
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
APP_DIR=$ROOT
GIT_REPO=$GIT_REPO
GIT_BRANCH=main
FRONTEND_PORT=3000
ADMIN_PORT=3001
BACKEND_PORT=5000
BUILD_MAX_OLD_SPACE=2048
EOF
info "deploy/deploy.env"

if [[ $KEEP_BACKEND_ENV -eq 0 ]]; then
  JWT_SECRET="$(openssl rand -hex 48)"
  JOB_SECRET="$(openssl rand -hex 32)"
  cat > "$ROOT/backend/.env" <<EOF
MONGO_URI=$MONGO_URI
PORT=5000
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
GMAIL_USER=$GMAIL_USER
GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD:-}
FRONTEND_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN,https://$ADMIN_DOMAIN
JOB_SECRET=$JOB_SECRET
EOF
  info "backend/.env            (JWT_SECRET and JOB_SECRET generated fresh)"
else
  info "backend/.env            (kept existing)"
fi

cat > "$ROOT/frontend/.env.production" <<EOF
NEXT_PUBLIC_API_URL=https://$API_DOMAIN/api
EOF
info "frontend/.env.production"

cat > "$ROOT/admin-dashboard/.env.production" <<EOF
NEXT_PUBLIC_API_URL=https://$API_DOMAIN/api
NEXT_PUBLIC_FRONTEND_URL=https://$DOMAIN
EOF
info "admin-dashboard/.env.production"

chmod 600 "$ROOT/backend/.env" "$ROOT/deploy/deploy.env"

# A development .env.local outranks .env.production in Next.js and would send
# the built bundle at localhost:5000. It should not exist on a fresh clone,
# but check rather than debug it later.
for app in frontend admin-dashboard; do
  if [[ -f "$ROOT/$app/.env.local" ]]; then
    warn "Removing $app/.env.local — it would override .env.production"
    run rm -f "$ROOT/$app/.env.local"
  fi
done

# ---------------------------------------------------------------------------
# 4. Nginx
# ---------------------------------------------------------------------------
step "Configuring Nginx"
if [[ "$DRY_RUN" == "1" ]]; then
  info "[dry-run] would run: bash deploy/render-nginx.sh"
else
  bash "$ROOT/deploy/render-nginx.sh"
fi

# ---------------------------------------------------------------------------
# 5. Install, build, start
# ---------------------------------------------------------------------------
step "Building and starting (this is the slow part — 5 to 15 minutes)"
if [[ "$DRY_RUN" == "1" ]]; then
  info "[dry-run] would run: bash deploy/deploy.sh --no-pull"
else
  bash "$ROOT/deploy/deploy.sh" --no-pull
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  pm2 save
fi

# ---------------------------------------------------------------------------
# 6. Certificates
# ---------------------------------------------------------------------------
step "Issuing HTTPS certificates"
if [[ "$DRY_RUN" == "1" ]]; then
  info "[dry-run] would run: certbot --nginx -d $DOMAIN -d $ADMIN_DOMAIN -d $API_DOMAIN"
else
  if certbot --nginx \
      -d "$DOMAIN" -d "$ADMIN_DOMAIN" -d "$API_DOMAIN" \
      --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect; then
    info "Certificates issued."
  else
    warn "Certbot failed — the site still works over http://."
    warn "Usual cause is DNS not resolving yet. Retry later with:"
    warn "  certbot --nginx -d $DOMAIN -d $ADMIN_DOMAIN -d $API_DOMAIN --agree-tos -m $LETSENCRYPT_EMAIL --redirect"
  fi
fi

# ---------------------------------------------------------------------------
# 7. Daily job
# ---------------------------------------------------------------------------
step "Scheduling the daily job"
CRON_LINE="0 2 * * * $ROOT/deploy/daily-job.sh >> /var/log/ump/daily-job.log 2>&1"
if [[ "$DRY_RUN" == "1" ]]; then
  info "[dry-run] would add cron: $CRON_LINE"
else
  chmod +x "$ROOT/deploy/daily-job.sh"
  # Replace any previous entry for this script rather than stacking duplicates
  # every time bootstrap is re-run.
  ( crontab -l 2>/dev/null | grep -v 'deploy/daily-job.sh' || true; echo "$CRON_LINE" ) | crontab -
  info "Runs at 02:00 server time."
fi

# ---------------------------------------------------------------------------
step "Done"
cat <<DONE

  Check these now:

    pm2 status                       three processes, all "online"
    curl -s http://127.0.0.1:5000/api/health

  Then in a browser:

    https://$DOMAIN
    https://$ADMIN_DOMAIN            change the default admin password
    https://$API_DOMAIN/api/health

  Still to do by hand:
    - Add this server's IP to Atlas Network Access, if you have not already
    - Copy backend/public/uploads across from your PC (see the runbook, step 9)
    - Change the admin login from admin / admin123

DONE
