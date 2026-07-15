const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const HOD     = require('../models/HOD');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { verifyHODToken } = require('../middleware/auth');

// POST /api/portal/hod/login
router.post('/login', async (req, res) => {
  try {
    const { hodId, password } = req.body;
    const hod = await HOD.findOne({ hodId });
    if (!hod) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, hod.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    if (hod.status === 'inactive') return res.status(403).json({ message: 'Your account is inactive. Contact admin.' });

    const token = jwt.sign(
      { id: hod._id, role: 'hod', hodId: hod.hodId, department: hod.department },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const hodData = hod.toObject();
    delete hodData.password;
    res.json({ token, hod: hodData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/hod/profile
router.get('/profile', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('-password');
    if (!hod) return res.status(404).json({ message: 'HOD not found.' });
    res.json(hod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/hod/students  — students in HOD's department
router.get('/students', verifyHODToken, async (req, res) => {
  try {
    const students = await Student.find({ department: req.user.department })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/hod/teachers  — teachers in HOD's department
router.get('/teachers', verifyHODToken, async (req, res) => {
  try {
    const teachers = await Teacher.find({ department: req.user.department })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/hod/stats
router.get('/stats', verifyHODToken, async (req, res) => {
  try {
    const dept = req.user.department;
    const [totalStudents, approvedStudents, pendingStudents, totalTeachers] = await Promise.all([
      Student.countDocuments({ department: dept }),
      Student.countDocuments({ department: dept, status: 'approved' }),
      Student.countDocuments({ department: dept, status: 'pending' }),
      Teacher.countDocuments({ department: dept }),
    ]);
    res.json({ totalStudents, approvedStudents, pendingStudents, totalTeachers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Correction Requests ──────────────────────────────────────────────────────
const CorrectionRequest = require('../models/CorrectionRequest');
const ResultSheet       = require('../models/ResultSheet');

// GET /api/portal/hod/correction-requests  — scoped to HOD's own department
router.get('/correction-requests', verifyHODToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { department: req.user.department };
    if (status) filter.status = status;
    const requests = await CorrectionRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/portal/hod/correction-requests/:id  (approve or reject)
router.patch('/correction-requests/:id', verifyHODToken, async (req, res) => {
  try {
    const { status, reviewerComment } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be "approved" or "rejected".' });

    const cr = await CorrectionRequest.findById(req.params.id);
    if (!cr) return res.status(404).json({ message: 'Correction request not found.' });
    if (cr.department !== req.user.department) return res.status(403).json({ message: 'Access denied: this request belongs to a different department.' });
    if (cr.status !== 'pending') return res.status(400).json({ message: 'This request has already been reviewed.' });

    cr.status          = status;
    cr.reviewedBy      = req.user.id;
    cr.reviewerRole    = 'hod';
    cr.reviewerComment = reviewerComment || '';
    cr.reviewedAt      = new Date();
    await cr.save();

    if (status === 'approved') {
      await ResultSheet.findByIdAndUpdate(cr.resultSheet, { status: 'draft' });
    }

    res.json({ message: `Correction request ${status}.`, request: cr });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Department Result Sheets ─────────────────────────────────────────────────────
// GET /api/portal/hod/result-sheets
router.get('/result-sheets', verifyHODToken, async (req, res) => {
  try {
    const hod = await require('../models/HOD').findById(req.user.id).select('department');
    if (!hod) return res.status(404).json({ message: 'HOD not found.' });
    const { semester, status, subject, examType } = req.query;
    const f = { department: new RegExp(hod.department, 'i') };
    if (semester) f.semester = semester;
    if (subject)  f.subject  = new RegExp(subject, 'i');
    if (examType) f.examType = examType;
    if (status)   f.status   = status;
    else          f.status   = { $in: ['submitted', 'finalized'] };
    const sheets = await ResultSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/hod/result-sheets/:id
router.get('/result-sheets/:id', verifyHODToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Not found.' });
    res.json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/hod/ongoing-classes  (dept-filtered)
const OngoingClass = require('../models/OngoingClass');
router.get('/ongoing-classes', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const f = { department: { $regex: hod.department, $options: 'i' } };
    const { semester, status, timeSession } = req.query;
    if (semester)    f.semester    = semester;
    if (status)      f.status      = status;
    if (timeSession) f.timeSession = timeSession;
    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/hod/datesheets  (dept-filtered published)
const DateSheet = require('../models/DateSheet');
router.get('/datesheets', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const f = { department: { $regex: hod.department, $options: 'i' } };
    const { semester, examType, isPublished } = req.query;
    if (semester) f.semester = semester;
    if (examType) f.examType = examType;
    if (isPublished !== undefined) f.isPublished = isPublished === 'true';
    const sheets = await DateSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Department Notices ─────────────────────────────────────────────────────
const DeptNotice = require('../models/DeptNotice');

// GET /api/portal/hod/notices
router.get('/notices', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department fullName');
    const notices = await DeptNotice.find({ department: hod.department }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/hod/notices
router.post('/notices', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department fullName');
    const { title, body, priority, isPublished } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const notice = new DeptNotice({
      title, body: body || '',
      department: hod.department,
      postedBy: req.user.id,
      postedByName: hod.fullName || '',
      priority: priority || 'normal',
      isPublished: isPublished !== false,
    });
    await notice.save();
    res.status(201).json(notice);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/hod/notices/:id
router.patch('/notices/:id', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const notice = await DeptNotice.findOne({ _id: req.params.id, department: hod.department });
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    const { title, body, priority, isPublished } = req.body;
    if (title !== undefined) notice.title = title;
    if (body !== undefined) notice.body = body;
    if (priority !== undefined) notice.priority = priority;
    if (isPublished !== undefined) notice.isPublished = isPublished;
    await notice.save();
    res.json(notice);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/hod/notices/:id
router.delete('/notices/:id', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const notice = await DeptNotice.findOneAndDelete({ _id: req.params.id, department: hod.department });
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    res.json({ message: 'Notice deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
