# Hostinger VPS Deployment — University of Makran

Ubuntu 24.04 · Node 20 · PM2 · Nginx · MongoDB Atlas · Let's Encrypt

This is the complete path from a freshly provisioned Hostinger VPS to a live
site on your own domain. Steps run in order; nothing here is optional unless
marked so.

**What you end up with**

| URL | Serves | Process |
|---|---|---|
| `https://DOMAIN` | public website | `ump-frontend` on 127.0.0.1:3000 |
| `https://admin.DOMAIN` | admin dashboard | `ump-admin` on 127.0.0.1:3001 |
| `https://api.DOMAIN` | REST API + `/uploads` | `ump-backend` on 127.0.0.1:5000 |

Only ports 22, 80 and 443 are reachable from the internet. The three Node
processes listen on loopback and are reached only through Nginx.

---

## Step 0 — Before you touch the server

Have these ready:

- The VPS **IP address** (hPanel → VPS → Overview).
- The **root password** or SSH key you set during provisioning.
- Your **domain**, with access to wherever its DNS is managed.
- A **MongoDB Atlas** account (free M0 tier is enough to start).

---

## Step 1 — Point DNS at the VPS

Do this first: DNS propagation takes time, and Let's Encrypt in Step 8 will
fail until the records resolve.

In your domain's DNS zone, create:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `YOUR_VPS_IP` | 300 |
| A | `www` | `YOUR_VPS_IP` | 300 |
| A | `admin` | `YOUR_VPS_IP` | 300 |
| A | `api` | `YOUR_VPS_IP` | 300 |

If the domain is registered with Hostinger, this is hPanel → Domains → DNS /
Nameservers → DNS records.

Check propagation (from your own machine, not the server):

```bash
dig +short yourdomain.edu.pk
dig +short api.yourdomain.edu.pk
```

Both must print your VPS IP before you run Step 8.

---

## Step 2 — Connect and secure the server

```bash
ssh root@YOUR_VPS_IP
```

If you provisioned with a password, change it now and consider adding an SSH
key:

```bash
passwd
```

Set the clock to your timezone so cron and log timestamps read sensibly:

```bash
timedatectl set-timezone Asia/Karachi
```

---

## Step 3 — Prepare the server

Clone the repo first, because the setup script lives in it:

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/sabir-sherani/university-makran.git university-makran
cd university-makran
```

> If the repo is private, generate a deploy key on the server
> (`ssh-keygen -t ed25519 -C "vps"`, then add `~/.ssh/id_ed25519.pub` to the
> repo's Deploy Keys on GitHub) and clone over SSH instead.

Then:

```bash
bash deploy/setup-server.sh
```

This installs Node 20, Nginx, PM2, Certbot and rsync, adds 2 GB of swap if the
VPS has less than 8 GB of RAM, and enables a firewall that allows only SSH and
HTTP/HTTPS. It is safe to re-run.

Verify:

```bash
node -v     # v20.x
pm2 -v
nginx -v
ufw status  # 22, 80, 443 only
```

---

## Step 4 — Set up MongoDB Atlas

1. Create a free **M0 cluster** in a region near Pakistan (Mumbai `ap-south-1`
   gives the lowest latency).
2. **Database Access** → Add New Database User → give it a strong password and
   the `readWrite` role on `university_makran`.
3. **Network Access** → Add IP Address → enter **your VPS IP** with `/32`.
   Do not use `0.0.0.0/0` on a production cluster.
4. **Connect → Drivers** → copy the connection string.

Two things people get wrong in that string:

- Replace `<password>` with the real password, **URL-encoded**. An `@` becomes
  `%40`, a `#` becomes `%23`, a `/` becomes `%2F`.
- Insert the database name before the `?`:
  `...mongodb.net/university_makran?retryWrites=true&w=majority`

### Migrating your existing data

If you have data in a local MongoDB, move it over from your own machine:

```bash
mongodump --uri="mongodb://localhost:27017/university_makran" --out=./dump
mongorestore --uri="<your Atlas URI>" --drop ./dump/university_makran
```

---

## Step 5 — Fill in the configuration

Still in `/var/www/university-makran`.

**5a. Deployment settings**

```bash
cp deploy/deploy.env.example deploy/deploy.env
nano deploy/deploy.env
```

Set `DOMAIN`, `ADMIN_DOMAIN`, `API_DOMAIN` and `LETSENCRYPT_EMAIL`. Leave the
ports alone unless you have a reason.

**5b. Backend secrets**

```bash
cp deploy/env/backend.env.example backend/.env
nano backend/.env
```

Generate fresh secrets — do **not** reuse the values from your development
`.env`:

```bash
openssl rand -hex 48   # → JWT_SECRET
openssl rand -hex 32   # → JOB_SECRET
```

Fill in `MONGO_URI` from Step 4, and replace the `REPLACE_DOMAIN` /
`REPLACE_ADMIN_DOMAIN` placeholders in `ALLOWED_ORIGINS` and `FRONTEND_URL`
with your real domains.

`ALLOWED_ORIGINS` is compared **exactly** by `backend/app.js` — no wildcards,
no trailing slashes. If you serve `www`, list it too:

```
ALLOWED_ORIGINS=https://yourdomain.edu.pk,https://www.yourdomain.edu.pk,https://admin.yourdomain.edu.pk
```

**5c. Frontend and admin**

```bash
cp deploy/env/frontend.env.example frontend/.env.production
cp deploy/env/admin.env.example     admin-dashboard/.env.production
nano frontend/.env.production
nano admin-dashboard/.env.production
```

Replace the placeholders with `https://api.yourdomain.edu.pk/api` and
`https://yourdomain.edu.pk`.

**Lock the files down** — they hold database credentials and an app password:

```bash
chmod 600 backend/.env deploy/deploy.env
```

---

## Step 6 — Configure Nginx

```bash
bash deploy/render-nginx.sh
```

This fills the domains and ports into `/etc/nginx/sites-available/`, disables
Ubuntu's default catch-all site, tests the config and reloads Nginx.

At this point `http://yourdomain.edu.pk` returns a 502 — correct, because
nothing is running behind the proxy yet.

---

## Step 7 — First deploy

```bash
bash deploy/deploy.sh
```

It checks your configuration, installs dependencies, builds both Next apps
with the production API URL compiled in, and starts all three processes under
PM2.

Expect **5–15 minutes** on a small VPS; the two Next builds dominate.

Then make PM2 survive reboots:

```bash
pm2 startup systemd     # prints a command — copy and run it
pm2 save
```

Check:

```bash
pm2 status              # three processes, status "online"
curl -s http://127.0.0.1:5000/api/health
```

The health check should return
`{"status":"Backend is running successfully!"}`.

---

## Step 8 — HTTPS

With DNS resolving (Step 1):

```bash
certbot --nginx \
  -d yourdomain.edu.pk -d www.yourdomain.edu.pk \
  -d admin.yourdomain.edu.pk \
  -d api.yourdomain.edu.pk \
  --agree-tos -m you@example.com --redirect
```

`--redirect` sends all HTTP traffic to HTTPS. Renewal is automatic via a
systemd timer; confirm with:

```bash
systemctl list-timers | grep certbot
certbot renew --dry-run
```

> If you ever re-run `render-nginx.sh`, it overwrites the site config and
> removes certbot's TLS blocks. Just run the `certbot --nginx` command again
> afterwards — it reuses the existing certificate.

---

## Step 9 — Move your existing uploads (if not using Cloudinary)

`backend/public/uploads` is gitignored, so the ~25 MB of files already on your
development machine did not come across with the clone. From your own machine:

```bash
rsync -avz "F:/final test of vibe coded/university-website/backend/public/uploads/" \
  root@YOUR_VPS_IP:/var/www/university-makran/backend/public/uploads/
```

On a VPS this directory is persistent, so local storage is a legitimate choice
and Cloudinary is optional. If you do want Cloudinary, fill in all three
`CLOUDINARY_*` variables in `backend/.env` and restart — `utils/cloudinary.js`
switches automatically when all three are present.

---

## Step 10 — Schedule the daily job

`POST /api/jobs/daily` (absence alerts, document reminders) has no internal
scheduler. Add a cron entry:

```bash
sudo crontab -e
```

```
0 2 * * * /var/www/university-makran/deploy/daily-job.sh >> /var/log/ump/daily-job.log 2>&1
```

Test it once by hand:

```bash
bash /var/www/university-makran/deploy/daily-job.sh
```

It should print `HTTP 200` and a summary.

---

## Step 11 — Go-live checklist

- [ ] **Change the default admin login.** The seeded account is
      `admin` / `admin123`. Change it in the admin dashboard before the domain
      is public.
- [ ] `JWT_SECRET` and `JOB_SECRET` are freshly generated, not the dev values.
- [ ] Gmail App Password set, and a password-reset email actually arrives.
- [ ] Atlas Network Access lists only your VPS IP.
- [ ] `curl -I https://yourdomain.edu.pk` returns 200 over HTTPS.
- [ ] Admin login works at `https://admin.yourdomain.edu.pk`.
- [ ] A file upload through the admin panel succeeds and the file opens.
- [ ] Student / teacher / HOD / exam / finance portal logins all work.
- [ ] `pm2 status` survives `reboot`.

---

## Routine operations

**Deploy a code change**

```bash
cd /var/www/university-makran && bash deploy/deploy.sh
```

**Change an environment variable**

Backend-only variables take effect with a restart:

```bash
pm2 restart ump-backend --update-env
```

Anything in `frontend/.env.production` or `admin-dashboard/.env.production`
is compiled into the browser bundle and needs a full rebuild:

```bash
bash deploy/deploy.sh --no-pull
```

**Logs**

```bash
pm2 logs ump-backend --lines 100
pm2 logs --lines 50            # all three
tail -f /var/log/nginx/error.log
```

**Restart everything**

```bash
pm2 restart all
```

---

## Troubleshooting

**502 Bad Gateway**
The Node process behind that domain is down. `pm2 status`, then
`pm2 logs ump-frontend --err --lines 50`.

**Website loads but no data, console shows CORS errors**
`ALLOWED_ORIGINS` in `backend/.env` does not exactly match the origin the
browser sent. Compare character for character — `https://` vs `http://`, `www`
vs no `www`, and no trailing slash. Then `pm2 restart ump-backend --update-env`.

**Website loads but requests go to `localhost:5000`**
The build baked in the wrong API URL. Almost always a leftover
`frontend/.env.local`. Delete it and rebuild — `deploy.sh` refuses to build
when it finds one, so this should not survive a normal deploy.

**Backend restarting in a loop**
Usually `MONGO_URI`. Check `pm2 logs ump-backend --err`. Common causes: the
password is not URL-encoded, the VPS IP is missing from Atlas Network Access,
or the database name is absent from the URI.

**Build killed / "JavaScript heap out of memory"**
The VPS ran out of RAM. Confirm swap exists (`free -h`), and lower
`BUILD_MAX_OLD_SPACE` in `deploy/deploy.env` to `1536`. Building the two Next
apps one at a time also helps on a 4 GB plan.

**Certbot: "challenge failed" / NXDOMAIN**
DNS has not propagated yet. Re-check with `dig +short`, wait, retry.

**Uploads fail with 413**
Nginx is set to 12 MB and multer to 10 MB. If you deliberately raise the app's
limit, raise `client_max_body_size` in the Nginx template to match.

**Admin panel links point at a Vercel URL**
`NEXT_PUBLIC_FRONTEND_URL` was not set at build time; `next.config.js` falls
back to the old deployment. Set it in `admin-dashboard/.env.production` and
rebuild.
