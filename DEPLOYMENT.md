# Deployment Guide

## Production Deployment

### Prerequisites
- Node.js v16+ installed
- MongoDB Atlas account (or MongoDB server)
- Hosting service (Vercel, Heroku, AWS, DigitalOcean, etc.)
- Domain name (optional but recommended)

## Frontend Deployment (Next.js)

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select `frontend` as root directory

3. **Set Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
   ```

4. **Deploy**
   - Vercel will auto-deploy on push

### Deploy to Netlify

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Connect to Netlify**
   - Drag and drop `frontend/.next` folder
   - Or connect GitHub for auto-deployment

### Self-Hosted (VPS)

```bash
# On your VPS
cd /var/www/university-website

# Pull latest code
git clone <repo-url> .

cd frontend
npm install
npm run build

# Use PM2 to keep running
npm install -g pm2
pm2 start "npm start" --name "ump-frontend"
pm2 save
pm2 startup
```

## Backend Deployment

### Deploy to Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create Procfile** in backend/
   ```
   web: node server.js
   ```

3. **Deploy**
   ```bash
   heroku create ump-backend
   heroku config:set MONGO_URI=<your-mongodb-atlas-uri>
   heroku config:set JWT_SECRET=<your-secret>
   git push heroku main
   ```

### Deploy to Railway/Render

1. **Connect GitHub repository**
2. **Set environment variables**
   - MONGO_URI
   - JWT_SECRET
   - PORT (usually auto-set)
3. **Deploy**

### Self-Hosted (VPS)

```bash
# On your VPS
cd /var/www/university-website/backend

npm install
npm start

# Or use PM2
npm install -g pm2
pm2 start server.js --name "ump-backend"
pm2 save
pm2 startup
```

## Admin Dashboard Deployment

Same as Frontend - deploy to Vercel/Netlify with:
- Root directory: `admin-dashboard`
- Environment: `NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api`

## Database Setup for Production

### MongoDB Atlas

1. **Create Cluster**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up and create project
   - Create cluster (M0 free tier is suitable for startup)

2. **Create Database User**
   - Database Access → Create new user
   - Set strong password

3. **Configure IP Whitelist**
   - Network Access → Add IP Address
   - Add your VPS/server IPs

4. **Get Connection String**
   - Click "Connect"
   - Copy connection string
   - Replace `<password>` with your user password
   - Use as MONGO_URI

## Environment Configuration

### Backend (.env for Production)
```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/university_makran
JWT_SECRET=your-very-secure-random-secret-key-here
PORT=5000
NODE_ENV=production
```

### Frontend (.env.local for Production)
```
NEXT_PUBLIC_API_URL=https://api.university-makran.com/api
```

### Admin Dashboard (.env.local for Production)
```
NEXT_PUBLIC_API_URL=https://api.university-makran.com/api
```

## Domain & SSL Setup

### Using Cloudflare (Recommended)

1. **Add Domain**
   - Go to Cloudflare
   - Add your domain
   - Update nameservers at registrar

2. **Point to Hosting**
   - Create A record pointing to your server/hosting IP
   - Enable Auto SSL

3. **Set Up Subdomains**
   ```
   university-makran.com → Frontend
   admin.university-makran.com → Admin Dashboard
   api.university-makran.com → Backend
   ```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular database backups
- [ ] Monitor server logs
- [ ] Enable email verification
- [ ] Set up logging/monitoring

## Performance Optimization

1. **Enable Caching**
   ```javascript
   // In server.js
   app.use((req, res) => {
     res.setHeader('Cache-Control', 'public, max-age=3600');
   });
   ```

2. **Compress Responses**
   ```bash
   npm install compression
   ```
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

3. **Database Indexing** (see DATABASE_SCHEMA.md)

4. **CDN Setup**
   - Use Cloudflare for static assets
   - Configure image optimization

## Monitoring & Maintenance

### Set Up Monitoring
- Use services like DataDog, New Relic, or Sentry
- Set up alerts for errors and downtime

### Automated Backups
```bash
# Backup MongoDB weekly
0 2 * * 0 mongodump --uri="<connection-string>" --out /backups/$(date +\%Y-\%m-\%d)
```

### Log Management
- Use ELK Stack, Sumo Logic, or similar
- Monitor API errors and performance

## Scaling Strategies

As traffic grows:

1. **Database**
   - Upgrade MongoDB tier
   - Enable sharding for larger datasets

2. **Backend**
   - Use load balancer (Nginx, HAProxy)
   - Run multiple Node.js instances with PM2 cluster mode
   - Implement caching (Redis)

3. **Frontend**
   - Use CDN for assets (CloudFlare, Cloudfront)
   - Enable image optimization
   - Implement lazy loading

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Slow API | Check MongoDB indexes, implement caching |
| 502 Bad Gateway | Restart backend, check memory usage |
| CORS errors | Verify CORS origin in backend |
| High latency | Use CDN, optimize queries, scale infrastructure |

## Post-Deployment Testing

1. **Functional Testing**
   - Test all forms and submissions
   - Verify all API endpoints
   - Check portal logins

2. **Performance Testing**
   - Use Lighthouse for frontend
   - Use artillery/k6 for load testing backend

3. **Security Testing**
   - Run OWASP ZAP scan
   - Test SQL injection (if applicable)
   - Verify authentication/authorization

## Support & Troubleshooting

For production issues:
1. Check error logs first
2. Monitor server resources
3. Review recent changes
4. Test in staging before production fixes

## Rollback Procedure

```bash
# If deployment fails
git revert <commit-hash>
git push
# Redeploy
```

---

**Deployment Complete!** Your University of Makran website is now live.
