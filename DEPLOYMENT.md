# Deployment Guide — University of Makran, Panjgur

This repo is three separate apps that deploy independently:

| App | Framework | Local port | Deploy target |
|---|---|---|---|
| `backend` | Express + Mongoose | 5000 | Railway (nixpacks) or any Node host (Procfile included for Heroku-style hosts) |
| `frontend` | Next.js (public site + student/teacher/HOD/exam/finance portals) | 3000 | Vercel |
| `admin-dashboard` | Next.js (admin panel) | 3001 | Vercel |

All three talk to each other only over HTTP — `frontend` and `admin-dashboard` call `backend`'s REST API at `NEXT_PUBLIC_API_URL`, and `backend` allows only the origins listed in `ALLOWED_ORIGINS` to call it. Get these two things wrong and nothing else in this guide matters, so they're covered first.

## Prerequisites

- Node.js v18+ (v16 works but is past end-of-life; use v18/v20 if you have a choice)
- A MongoDB Atlas cluster (or any reachable MongoDB 5+ instance)
- A Cloudinary account (optional — see [File uploads](#file-uploads--cloudinary-optional) below)
- A Gmail account with an App Password (for password-reset and contact-form email)
- Vercel account (frontend + admin-dashboard)
- Railway account, or any Node-capable host (backend)

## 1. Environment variables — complete reference

### `backend/.env`

| Variable | Required | Example | Notes |
|---|---|---|---|
| `MONGO_URI` | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/university_makran` | Full Atlas (or self-hosted) connection string, database name included. |
| `JWT_SECRET` | **Yes** | `openssl rand -hex 32` output | Long random string. Every portal's login token is signed with this — rotating it logs everyone out. |
| `PORT` | No | `5000` | Most hosts (Railway, Heroku) inject this automatically; only set it yourself for local/self-hosted runs. |
| `NODE_ENV` | Recommended | `production` | Controls error-detail verbosity — see `utils/sendError.js` (stack traces are hidden from API responses when this is `production`). |
| `ALLOWED_ORIGINS` | **Yes in production** | `https://uomp.vercel.app,https://uomp-admin.vercel.app` | Comma-separated, **no trailing slashes, no spaces after commas needed** (they're trimmed). Falls back to `http://localhost:3000,http://localhost:3001` if unset — fine for local dev, **wrong for production** (every cross-origin request from the deployed frontends will be rejected by CORS until this is set correctly). |
| `FRONTEND_URL` | Recommended | `https://uomp.vercel.app` | Used to build the link inside password-reset emails (`routes/studentPortal.js`). |
| `GMAIL_USER` | For email features | `you@gmail.com` | Sender address for password-reset and contact-form mail. |
| `GMAIL_APP_PASSWORD` | For email features | 16-char app password | **Not your Gmail login password.** Generate at Google Account → Security → 2-Step Verification → App passwords. Without this + `GMAIL_USER`, email sending fails silently (caught and logged, doesn't crash the request) — password reset and contact-form notifications just won't be delivered. |
| `CLOUDINARY_CLOUD_NAME` | Optional | `your-cloud-name` | See [File uploads](#file-uploads--cloudinary-optional). |
| `CLOUDINARY_API_KEY` | Optional | — | Required together with the other two Cloudinary vars, or none of them. |
| `CLOUDINARY_API_SECRET` | Optional | — | Required together with the other two Cloudinary vars, or none of them. |

### `frontend/.env.local` and `admin-dashboard/.env.local`

| Variable | Required | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://your-backend.up.railway.app/api` |

Both apps use the **same** variable name and must point at the **same** deployed backend, with the trailing `/api` included (the codebase does not append it for you). Because it's prefixed `NEXT_PUBLIC_`, Next.js inlines it into the client bundle at **build time** — changing it in Vercel's dashboard requires a redeploy (not just a restart) to take effect.

## File uploads — Cloudinary (optional)

`backend/utils/cloudinary.js` auto-detects whether Cloudinary is configured:

- **All three `CLOUDINARY_*` vars set** → uploads (profile photos, result-sheet/datesheet PDFs, notice attachments, gallery images, etc.) go to Cloudinary and persist across deploys/restarts.
- **Any of them missing** → falls back to writing to `backend/public/uploads/` on local disk.

The local-disk fallback is fine for local development, but **do not rely on it in production on Railway/Heroku-style hosts** — their filesystems are ephemeral, so every uploaded file is silently lost on the next deploy or restart. Set all three Cloudinary vars for any real deployment.

## 2. Backend deployment

The repo ships both a `Procfile` (Heroku-compatible) and `nixpacks.toml` (Railway) in `backend/` — use whichever matches your host; you don't need both.

### Railway (recommended — matches `nixpacks.toml`)

1. New Project → Deploy from GitHub repo → set **Root Directory** to `backend`.
2. Railway detects `nixpacks.toml` automatically (`npm install` at build, `node server.js` at start — same as the `Procfile`'s `web: node server.js`).
3. Variables tab → add every var from the [backend table](#backendenv) above.
4. Deploy. Railway assigns a public URL and injects `PORT` itself — don't hardcode `PORT` in Railway's variables.
5. Once deployed, copy the public URL + `/api` for use as `NEXT_PUBLIC_API_URL` in both frontend apps.

### Heroku (alternative — matches `Procfile`)

```bash
heroku create ump-backend
heroku config:set MONGO_URI=... JWT_SECRET=... ALLOWED_ORIGINS=... FRONTEND_URL=... GMAIL_USER=... GMAIL_APP_PASSWORD=... CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... NODE_ENV=production
git subtree push --prefix backend heroku main
```

### Any other Node host / VPS

```bash
cd backend
npm install
# set the env vars in your host's dashboard, or write backend/.env
npm start          # or: pm2 start server.js --name ump-backend
```

## 3. Frontend deployment (Vercel)

1. New Project → Import the repo → set **Root Directory** to `frontend`.
2. Vercel auto-detects Next.js (`next build` / `next start`) — no build command overrides needed.
3. Environment Variables → add `NEXT_PUBLIC_API_URL` = your deployed backend URL + `/api`.
4. Deploy.
5. `next.config.js` already sets `images: { unoptimized: true }`, so there's no image-domain allowlist to configure.

## 4. Admin dashboard deployment (Vercel)

Same steps as the frontend, as a **separate** Vercel project:

1. New Project → same repo → **Root Directory** = `admin-dashboard`.
2. Environment Variables → `NEXT_PUBLIC_API_URL` = same backend URL + `/api` as the frontend.
3. Deploy.

## 5. Wire CORS to both deployed domains

Once both Vercel projects have their final `*.vercel.app` (or custom) domains, go back to the backend host's environment variables and set:

```
ALLOWED_ORIGINS=https://<your-frontend-domain>,https://<your-admin-dashboard-domain>
```

Redeploy the backend after changing this — `server.js` reads it once at process start (`const allowedOrigins = process.env.ALLOWED_ORIGINS ? ... : [...]`), not per-request. If you add a Vercel preview-deployment domain or a custom domain later, add it to this list too; requests from an origin not in the list are rejected by `cors()` before they reach any route.

## 6. MongoDB Atlas setup

1. https://cloud.mongodb.com → create a project → build a cluster (the free M0 tier is enough to run this app).
2. Database Access → add a database user with a strong password (this is the `user:pass` in `MONGO_URI`).
3. Network Access → Add IP Address. For Railway/Heroku (dynamic egress IPs), the simplest option is `0.0.0.0/0` (allow from anywhere) since access is still gated by the database user's password; if your host publishes static egress IPs, allowlist those instead.
4. Connect → Drivers → copy the `mongodb+srv://...` string, substitute the real password, and append a database name before the `?` (e.g. `.../university_makran?retryWrites=true...`) — the app does **not** default to a named database on an Atlas URI the way it does for the `mongodb://localhost` fallback.

## 7. Seed the database

After the backend is deployed and pointed at your real `MONGO_URI` (or when setting up locally against a fresh database), run the seed script **once** from the `backend` directory, with `MONGO_URI` set in the environment it runs in:

```bash
cd backend
node seed.js
```

It's idempotent — re-running it skips anything that already exists by unique key (department slug, program title, teacher/HOD/exam/finance id, etc.) rather than duplicating it. See the script's own console output for the full list of demo credentials it creates (also documented in `WORKFLOW_DEMO.md`).

Run it against Atlas by pointing `MONGO_URI` at the Atlas connection string when invoking it — e.g. from your local machine with the production `MONGO_URI` temporarily exported, or as a one-off Railway job with the same env vars as the deployed service.

## Security checklist before going live

- [ ] `JWT_SECRET` is a long random value, not the sample from `.env.example`
- [ ] `NODE_ENV=production` on the deployed backend (hides stack traces from API error responses)
- [ ] `ALLOWED_ORIGINS` lists only the real frontend/admin-dashboard domains — not `*`, not left unset
- [ ] MongoDB Atlas database user password is strong and unique to this project
- [ ] Cloudinary vars are set so uploaded files survive redeploys (see [File uploads](#file-uploads--cloudinary-optional))
- [ ] The default seeded Admin password (`Admin@123`) has been changed after first login
- [ ] Gmail App Password is used, never the real account password

## Post-deployment smoke test

1. `GET https://<backend>/api/health` → `{"status":"Backend is running successfully!"}`
2. Load the deployed frontend → public pages (departments, programs, news) render with real data, not the "failed to load" fallback state.
3. Load the deployed admin-dashboard → log in with the seeded admin account → `Portal Overview` stat cards on the dashboard show non-zero counts if you've seeded/registered data.
4. Open browser devtools on the deployed frontend and confirm there are **no CORS errors** in the console when hitting any `/api/portal/*` login route — a CORS error here means `ALLOWED_ORIGINS` doesn't include this exact origin (check for a stray trailing slash or `http` vs `https` mismatch).
5. Walk through `WORKFLOW_DEMO.md` end-to-end against the deployed environment.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend shows empty lists / "failed to load" everywhere | `NEXT_PUBLIC_API_URL` wrong or missing `/api` suffix; check it was set **before** the Vercel build (it's baked in at build time) |
| Browser console: `has been blocked by CORS policy` | Deployed frontend's exact origin isn't in the backend's `ALLOWED_ORIGINS`, or the backend hasn't redeployed since you changed it |
| Login works but every subsequent request is 401 | `JWT_SECRET` changed (or differs between backend instances) after the token was issued — log in again |
| Uploaded images/PDFs 404 after a while | Cloudinary vars not set — files were written to ephemeral local disk and lost on redeploy/restart |
| Password reset / contact form emails never arrive | `GMAIL_USER`/`GMAIL_APP_PASSWORD` unset or wrong — check backend logs, `utils/mailer.js` logs failures instead of throwing |
| `MongoServerError: bad auth` on startup | Database user/password in `MONGO_URI` is wrong, or the user doesn't have access to the named database |
| Backend works locally, times out when deployed | Atlas Network Access doesn't allow the host's egress IP — see [MongoDB Atlas setup](#6-mongodb-atlas-setup) |
