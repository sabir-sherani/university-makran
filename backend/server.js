const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const multer = require('multer');
require('dotenv').config();

const { sendServerError } = require('./utils/sendError');

const app = express();

// Security headers. This API is consumed cross-origin by separate frontend/
// admin-dashboard apps (and serves uploaded images to them via <img> tags),
// so the resource policy has to allow cross-origin reads — helmet's default
// of same-origin would silently break every uploaded image/file.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Middleware
// 100kb is plenty for JSON payloads; file uploads go through multer
// (multipart/form-data) and are governed by each upload route's own
// fileSize limit instead, so this never affects them.
app.use(express.json({ limit: '100kb' }));

// Strip any request keys starting with '$' or containing '.' so user input
// can never be interpreted as a MongoDB query operator (NoSQL injection).
app.use(mongoSanitize());

// Makes res.sendServerError(err) available on every route without each file
// needing its own import — see utils/sendError.js for what it does.
app.use((req, res, next) => {
  res.sendServerError = (err, fallback) => sendServerError(res, err, fallback);
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, cb) => {
    // Exact match only — startsWith() previously let
    // https://evil.com/https://allowed-origin.com through, since the
    // attacker's page can freely set its own Origin-adjacent string.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Serve uploaded files — never execute them, never let the browser guess a
// different content type than what was stored, and always prompt a download
// rather than rendering (blocks stored-XSS via an uploaded .html/.svg, and
// blocks MIME-sniffing attacks on any file type).
app.use('/uploads', (req, res, next) => {
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, 'public/uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected');
    const { logMissingIndexes } = require('./utils/checkIndexes');
    const models = [
      require('./models/Student'), require('./models/Teacher'), require('./models/HOD'),
      require('./models/ExaminationStaff'), require('./models/FinanceStaff'), require('./models/Employee'),
      require('./models/TeacherIdSlot'), require('./models/FeeChallan'), require('./models/Department'),
      require('./models/Program'), require('./models/AcademicSession'), require('./models/Semester'),
      require('./models/SemesterCourse'), require('./models/Designation'), require('./models/Admin'),
      require('./models/DegreeVerification'),
    ];
    logMissingIndexes(models).catch(err => console.warn('[index-check] failed:', err.message));
  })
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
const lookupsRouter = require('./routes/lookups');

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
app.use('/api/lookups', lookupsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running successfully!' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'University of Makran Backend API', version: '1.0.0' });
});

// Global error handler — catches errors raised outside a route handler's own
// try/catch, e.g. multer's fileFilter/limits rejecting an upload before the
// route body ever runs. Without this, Express's default handler renders a
// bare HTML page (with a full server stack trace outside production) instead
// of the JSON the frontend expects from every other error path in this API.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err?.message) {
    return res.status(400).json({ message: err.message || 'Upload failed.' });
  }
  sendServerError(res, err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`PORT env var: ${process.env.PORT}`);
});
