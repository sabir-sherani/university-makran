# Quick Start Guide

## Running All Services (Windows)

### Option 1: Terminal Approach (Recommended)

1. Open three terminals/command prompts

**Terminal 1 - Backend**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - Frontend**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 - Admin Dashboard**
```bash
cd admin-dashboard
npm install
npm run dev
```

### Option 2: Using Batch Script

Create a file `start.bat` in the project root:

```batch
@echo off
start cmd /k "cd backend && npm install && npm run dev"
start cmd /k "cd frontend && npm install && npm run dev"
start cmd /k "cd admin-dashboard && npm install && npm run dev"
echo All services started!
```

Run it: `start.bat`

## Access Points

- **Frontend**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3001
- **API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health

## Initial Setup Required

### Before Running:

1. **Install MongoDB**
   - Download from https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud)

2. **Create .env in backend folder**
   ```
   MONGO_URI=mongodb://localhost:27017/university_makran
   JWT_SECRET=secret123
   PORT=5000
   NODE_ENV=development
   ```

3. **Run npm install**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../admin-dashboard && npm install
   ```

## Testing

### Frontend Features
1. Visit http://localhost:3000
2. Test all navigation links
3. Fill in forms (Admission, Feedback, Contact)
4. Test Portal pages with demo credentials

### Admin Panel
1. Visit http://localhost:3001
2. Login with admin/admin123
3. Add/Edit/Delete departments, programs, facilities
4. Review applications and feedback

### API Testing
Use Postman or curl:
```bash
curl http://localhost:5000/api/departments
curl http://localhost:5000/api/programs
```

## Deployment Checklist

- [ ] Update university contact information
- [ ] Set production environment variables
- [ ] Enable proper JWT secret
- [ ] Configure MongoDB Atlas for production
- [ ] Update CORS settings
- [ ] Test all forms and API endpoints
- [ ] Set up email notifications
- [ ] Configure hosting (Vercel, Heroku, AWS, etc.)

## First Time Database Setup

The database will auto-create collections when needed. To pre-populate data:

1. Use the Admin Dashboard to add:
   - 2-3 Departments
   - 2-3 Programs
   - 3-4 Facilities

2. Or use MongoDB Compass to insert sample data

## Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change port in next.config.js or .env |
| MongoDB not found | Start MongoDB service or use Atlas |
| API not responding | Check backend is running, CORS enabled |
| Build errors | Delete node_modules and package-lock.json, run npm install |

## Next Steps

1. Customize branding and colors
2. Add real university information
3. Set up email notifications
4. Configure payment gateway for fees (optional)
5. Deploy to production
