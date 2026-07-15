# University of Makran - Complete Website

A comprehensive, full-stack website for University of Makran, Panjgur with frontend, backend, database, and admin dashboard.

## Project Structure

```
university-website/
├── frontend/           # Next.js frontend (http://localhost:3000)
├── backend/           # Express.js API (http://localhost:5000)
└── admin-dashboard/   # Next.js admin panel (http://localhost:3001)
```

## Features

### Frontend Pages
- **Home** - University homepage with statistics and featured programs
- **About** - Mission, vision, and values
- **Admission** - Admission application form
- **Administration** - Staff and department information
- **Departments** - All academic departments
- **Programs** - Arts, Science, and specialized programs
- **Facilities** - Campus laboratories and facilities
- **Feedback Portal** - User feedback form
- **Portal** - Student and Employee login portals
- **Degree Verification** - Verify academic credentials
- **Contact Us** - Contact form

### Admin Dashboard
- **Dashboard** - Overview and statistics
- **Departments** - Add/edit/delete departments
- **Programs** - Manage academic programs
- **Facilities** - Manage campus facilities
- **Staff** - Manage faculty and staff
- **Applications** - Review admission applications
- **Feedback** - View user feedback
- **Messages** - Contact form messages

### Backend APIs
RESTful APIs for all content management and user interactions

### Database
MongoDB with comprehensive schemas for all entities

## Prerequisites

- Node.js (v16+)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation & Setup

### 1. Clone/Download the Project

Navigate to the project root directory.

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your MongoDB URI
# MONGO_URI=mongodb://localhost:27017/university_makran

# Start backend server
npm run dev
```

Backend will run on: http://localhost:5000

### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: http://localhost:3000

### 4. Setup Admin Dashboard

```bash
cd ../admin-dashboard

# Install dependencies
npm install

# Start admin development server
npm run dev
```

Admin Dashboard will run on: http://localhost:3001

## Usage

### Frontend
- Visit http://localhost:3000
- Browse all pages
- Fill admission forms, feedback, and contact forms
- Use student/employee portals
- Verify degrees

### Admin Dashboard
- Visit http://localhost:3001
- Default Login: admin / admin123
- Manage all content from the dashboard

### API Endpoints

#### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

#### Programs
- `GET /api/programs` - Get all programs
- `POST /api/programs` - Create program
- `PUT /api/programs/:id` - Update program
- `DELETE /api/programs/:id` - Delete program

#### Facilities
- `GET /api/facilities` - Get all facilities
- `POST /api/facilities` - Create facility
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility

#### Admissions
- `GET /api/admissions` - Get all applications
- `POST /api/admissions/apply` - Submit application
- `PUT /api/admissions/:id` - Update application status

#### Portal
- `POST /api/portal/student/login` - Student login
- `POST /api/portal/employee/login` - Employee login

#### Other Endpoints
- `POST /api/feedback` - Submit feedback
- `POST /api/contact` - Send contact message
- `POST /api/degree-verification` - Verify degree
- `GET /api/stats` - Get statistics
- `GET /api/pages/about` - Get about page content

## Building for Production

### Frontend
```bash
cd frontend
npm run build
npm start
```

### Admin Dashboard
```bash
cd admin-dashboard
npm run build
npm start
```

### Backend
```bash
cd backend
npm start
```

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/university_makran
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=production
```

### Frontend & Admin (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Customization

### Colors & Branding
Edit `tailwind.config.js` in frontend and admin-dashboard to change theme colors.

### Database Content
Use the admin dashboard to add/edit departments, programs, and facilities.

### Email & Contact
Update contact information in:
- Frontend: `pages/contact.js`, `components/Footer.js`
- Backend: Routes and models

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running locally or update MONGO_URI with your cloud instance

### Port Already in Use
- Frontend: Change port in `next.config.js`
- Admin: Already configured for port 3001
- Backend: Change PORT in `.env`

### API Not Responding
- Check backend is running on port 5000
- Verify CORS is enabled
- Check network connectivity

## Support

For questions or issues, contact the development team.

## License

All rights reserved © University of Makran, Panjgur
