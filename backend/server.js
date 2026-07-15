const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// API Routes
const departmentsRouter = require('./routes/departments');
const programsRouter = require('./routes/programs');
const facultyRouter = require('./routes/faculty');
const coursesRouter = require('./routes/courses');
const facilitiesRouter = require('./routes/facilities');
const admissionsRouter = require('./routes/admissions');
const feedbackRouter = require('./routes/feedback');
const degreeVerificationRouter = require('./routes/degreeVerification');
const contactRouter = require('./routes/contact');
const studentPortalRouter = require('./routes/studentPortal');
const teacherPortalRouter = require('./routes/teacherPortal');
const adminPortalRouter = require('./routes/adminPortal');
const hodPortalRouter = require('./routes/hodPortal');
const examPortalRouter = require('./routes/examPortal');
const financePortalRouter = require('./routes/financePortal');
const statsRouter = require('./routes/stats');
const administrationRouter = require('./routes/administration');
const pagesRouter = require('./routes/pages');
const newsRouter = require('./routes/news');
const adminDeptsRouter = require('./routes/adminDepts');
const searchRouter = require('./routes/search');
const admissionContentRouter = require('./routes/admissionContent');
const galleryRouter = require('./routes/gallery');
const scholarshipsRouter = require('./routes/scholarships');
const { router: twoFactorRouter } = require('./routes/twoFactor');

// Use routes
app.use('/api/departments', departmentsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/faculty', facultyRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/facilities', facilitiesRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/degree-verification', degreeVerificationRouter);
app.use('/api/contact', contactRouter);
app.use('/api/portal/student', studentPortalRouter);
app.use('/api/portal/teacher', teacherPortalRouter);
app.use('/api/portal/admin', adminPortalRouter);
app.use('/api/portal/hod', hodPortalRouter);
app.use('/api/portal/exam', examPortalRouter);
app.use('/api/portal/finance', financePortalRouter);
app.use('/api/stats', statsRouter);
app.use('/api/administration', administrationRouter);
app.use('/api/pages/about', pagesRouter);
app.use('/api/news', newsRouter);
app.use('/api/admin-depts', adminDeptsRouter);
app.use('/api/search', searchRouter);
app.use('/api/admission-content', admissionContentRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/scholarships', scholarshipsRouter);
app.use('/api/2fa', twoFactorRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running successfully!' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'University of Makran Backend API', version: '1.0.0' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
