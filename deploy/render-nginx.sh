#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Renders deploy/nginx/university-makran.conf.template into Nginx, filling in
# the domains and ports from deploy/deploy.env.
#
#   sudo bash deploy/render-nginx.sh
#
# Run this BEFORE certbot. Re-running it overwrites the site config, which
# removes the TLS blocks certbot added — so after any re-render, run
# `certbot --nginx` again (it is idempotent and will not re-issue unless the
# certificate is near expiry).
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/deploy/deploy.env"

if [[ $EUID -ne 0 ]]; then
  echo "Run this as root:  sudo bash deploy/render-nginx.sh" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/deploy.env.example and fill it in." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DOMAIN:?DOMAIN is not set in deploy.env}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN is not set in deploy.env}"
: "${API_DOMAIN:?API_DOMAIN is not set in deploy.env}"

TARGET=/etc/nginx/sites-available/university-makran.conf

# Only these names are substituted. Without the explicit list, envsubst would
# also eat Nginx's own $host, $remote_addr and $proxy_add_x_forwarded_for and
# replace them with empty strings.
envsubst '${DOMAIN} ${ADMIN_DOMAIN} ${API_DOMAIN} ${FRONTEND_PORT} ${ADMIN_PORT} ${BACKEND_PORT}' \
  < "$ROOT/deploy/nginx/university-makran.conf.template" > "$TARGET"

ln -sfn "$TARGET" /etc/nginx/sites-enabled/university-makran.conf

# Ubuntu's packaged default site answers on port 80 for any unmatched host,
# which shadows the real site when DNS has not fully propagated yet.
rm -f /etc/nginx/sites-enabled/default

echo "Testing Nginx configuration..."
nginx -t
systemctl reload nginx

echo
echo "Nginx now serving:"
echo "  http://$DOMAIN        -> 127.0.0.1:${FRONTEND_PORT:-3000}"
echo "  http://$ADMIN_DOMAIN  -> 127.0.0.1:${ADMIN_PORT:-3001}"
echo "  http://$API_DOMAIN    -> 127.0.0.1:${BACKEND_PORT:-5000}"
