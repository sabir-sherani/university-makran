#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Build and (re)start all three apps.
#
#   bash deploy/deploy.sh            # pull latest, install, build, reload
#   bash deploy/deploy.sh --no-pull  # build what is already checked out
#
# Run it after every code change. A PM2 restart alone is NOT enough for the
# two Next.js apps: next.config.js bakes NEXT_PUBLIC_API_URL into the client
# bundle at build time, so the values only take effect through a rebuild.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

PULL=1
[[ "${1:-}" == "--no-pull" ]] && PULL=0

# --- Load deployment settings ---------------------------------------------
[[ -f deploy/deploy.env ]] || fail "deploy/deploy.env not found. Copy deploy/deploy.env.example and fill it in."
set -a
# shellcheck disable=SC1091
source deploy/deploy.env
set +a

# --- Preflight checks ------------------------------------------------------
log "Preflight"

[[ -f backend/.env ]] || fail "backend/.env not found. See deploy/env/backend.env.example."
[[ -f frontend/.env.production ]] || fail "frontend/.env.production not found. See deploy/env/frontend.env.example."
[[ -f admin-dashboard/.env.production ]] || fail "admin-dashboard/.env.production not found. See deploy/env/admin.env.example."

# Next.js ranks .env.local ABOVE .env.production. A leftover development
# .env.local pointing at http://localhost:5000/api is the single most common
# way a deployment builds cleanly and then fails in the browser with CORS or
# connection-refused errors, so refuse to build until it is gone.
for app in frontend admin-dashboard; do
  if [[ -f "$app/.env.local" ]]; then
    fail "$app/.env.local exists and would override .env.production. Delete it:  rm $app/.env.local"
  fi
done

if grep -q 'REPLACE_' backend/.env frontend/.env.production admin-dashboard/.env.production; then
  fail "An env file still contains a REPLACE_ placeholder. Fill in the real domains first."
fi

grep -qE '^JWT_SECRET=.+' backend/.env || fail "JWT_SECRET is empty in backend/.env."
grep -qE '^MONGO_URI=.+' backend/.env  || fail "MONGO_URI is empty in backend/.env."

command -v pm2 >/dev/null 2>&1 || fail "PM2 not installed. Run deploy/setup-server.sh first."

echo "  Node $(node -v), npm $(npm -v), PM2 $(pm2 -v)"

# --- Pull ------------------------------------------------------------------
if [[ $PULL -eq 1 ]]; then
  log "Pulling ${GIT_BRANCH:-main}"
  git fetch --all --prune
  git checkout "${GIT_BRANCH:-main}"
  git pull --ff-only origin "${GIT_BRANCH:-main}"
fi

export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=${BUILD_MAX_OLD_SPACE:-2048}"

# --- Backend ---------------------------------------------------------------
log "Installing backend dependencies"
( cd backend && npm ci --omit=dev )

# --- Frontend --------------------------------------------------------------
# The env file is sourced into the build shell as well as being read by
# Next's own loader. Shell variables win, which makes the value that lands in
# the bundle unambiguous no matter how Next orders its env sources.
log "Building frontend"
(
  cd frontend
  set -a; source .env.production; set +a
  echo "  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
  npm ci
  rm -rf .next
  npm run build
)

# --- Admin dashboard -------------------------------------------------------
log "Building admin dashboard"
(
  cd admin-dashboard
  set -a; source .env.production; set +a
  echo "  NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
  echo "  NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL"
  npm ci
  rm -rf .next
  npm run build
)

# --- Start / reload --------------------------------------------------------
log "Starting processes"
mkdir -p /var/log/ump 2>/dev/null || sudo mkdir -p /var/log/ump

# startOrReload starts the apps the first time and does a zero-downtime
# reload on every run after that.
pm2 startOrReload deploy/ecosystem.config.js --update-env
pm2 save

log "Done"
pm2 status
echo
echo "Smoke test:"
echo "  curl -s https://${API_DOMAIN}/api/health"
