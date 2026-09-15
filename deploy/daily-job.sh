#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Triggers POST /api/jobs/daily — the absence alerts, document reminders and
# other once-a-day work in backend/jobs/dailyJobs.js. The app has no internal
# scheduler, so nothing runs unless something outside it calls this endpoint.
#
# Install as a root cron entry (runs 02:00 server time):
#   sudo crontab -e
#   0 2 * * * /var/www/university-makran/deploy/daily-job.sh >> /var/log/ump/daily-job.log 2>&1
#
# The server clock is probably UTC. 02:00 UTC is 07:00 in Pakistan (PKT is
# UTC+5). To run at 02:00 local instead, either use `0 21 * * *` or set the
# server timezone:  sudo timedatectl set-timezone Asia/Karachi
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# JOB_SECRET is read from the backend's own env file, so there is only ever
# one copy of it on the server.
JOB_SECRET="$(grep -E '^JOB_SECRET=' "$ROOT/backend/.env" | cut -d= -f2- | tr -d '"'"'"' \r')"
PORT="$(grep -E '^PORT=' "$ROOT/backend/.env" | cut -d= -f2- | tr -d ' \r')"

if [[ -z "$JOB_SECRET" ]]; then
  echo "$(date -Is) ERROR: JOB_SECRET not set in backend/.env" >&2
  exit 1
fi

# Called over loopback rather than the public domain: no DNS, no TLS, and it
# keeps working during a certificate renewal.
RESPONSE="$(curl -sS -w '\n%{http_code}' -X POST \
  -H "x-job-secret: $JOB_SECRET" \
  "http://127.0.0.1:${PORT:-5000}/api/jobs/daily")"

BODY="$(echo "$RESPONSE" | head -n -1)"
CODE="$(echo "$RESPONSE" | tail -n 1)"

echo "$(date -Is) HTTP $CODE $BODY"
[[ "$CODE" == "200" ]] || exit 1
