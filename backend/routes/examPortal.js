const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const ExaminationStaff = require('../models/ExaminationStaff');
const Student  = require('../models/Student');
const DateSheet = require('../models/DateSheet');
const Result    = require('../models/Result');
const { verifyExamToken } = require('../middleware/auth');
const DegreeVerification = require('../models/DegreeVerification');

const uploadDir = path.join(__dirname, '../public/uploads/portal');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/portal/exam/login
router.post('/login', async (req, res) => {
  try {
    const { examId, password } = req.body;
    const staff = await ExaminationStaff.findOne({ examId });
    if (!staff) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    if (staff.status === 'inactive') return res.status(403).json({ message: 'Your account is inactive. Contact admin.' });

    const token = jwt.sign(
      { id: staff._id, role: 'exam', examId: staff.examId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const staffData = staff.toObject();
    delete staffData.password;
    res.json({ token, staff: staffData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/exam/profile
router.get('/profile', verifyExamToken, async (req, res) => {
  try {
    const staff = await ExaminationStaff.findById(req.user.id).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/exam/stats
router.get('/stats', verifyExamToken, async (req, res) => {
  try {
    const [totalStudents, totalDateSheets, publishedDateSheets, totalResults] = await Promise.all([
      Student.countDocuments({ status: 'approved' }),
      DateSheet.countDocuments(),
      DateSheet.countDocuments({ isPublished: true }),
      Result.countDocuments(),
    ]);
    res.json({ totalStudents, totalDateSheets, publishedDateSheets, totalResults });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/exam/datesheets
router.get('/datesheets', verifyExamToken, async (req, res) => {
  try {
    const sheets = await DateSheet.find().sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/portal/exam/datesheets  — upload a new date sheet
router.post('/datesheets', verifyExamToken, upload.single('file'), async (req, res) => {
  try {
    const { title, department, program, semester, academicSession, timeSession, isPublished } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Please upload a PDF file.' });
    const sheet = new DateSheet({
      title, department, program, semester, academicSession,
      timeSession: timeSession || undefined,
      isPublished: isPublished === 'true',
      fileUrl: `/uploads/portal/${req.file.filename}`,
      uploadedBy: req.user.id,
      uploaderRole: 'exam',
    });
    await sheet.save();
    res.status(201).json(sheet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/portal/exam/datesheets/:id/publish
router.patch('/datesheets/:id/publish', verifyExamToken, async (req, res) => {
  try {
    const sheet = await DateSheet.findByIdAndUpdate(
      req.params.id,
      { isPublished: req.body.isPublished },
      { new: true }
    );
    res.json(sheet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/portal/exam/datesheets/:id
router.delete('/datesheets/:id', verifyExamToken, async (req, res) => {
  try {
    await DateSheet.findByIdAndDelete(req.params.id);
    res.json({ message: 'Date sheet deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/exam/results
router.get('/results', verifyExamToken, async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/portal/exam/results
router.post('/results', verifyExamToken, upload.single('file'), async (req, res) => {
  try {
    const { title, department, program, semester, academicSession, timeSession, passingMarks, isPublished } = req.body;
    if (!req.file) return res.status(400).json({ message: 'Please upload a file.' });
    const result = new Result({
      title, department, program, semester, academicSession,
      timeSession: timeSession || undefined,
      passingMarks: passingMarks || 40,
      isPublished: isPublished === 'true',
      fileUrl: `/uploads/portal/${req.file.filename}`,
      uploadedBy: req.user.id,
      uploaderRole: 'exam',
    });
    await result.save();
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/portal/exam/results/:id/publish
router.patch('/results/:id/publish', verifyExamToken, async (req, res) => {
  try {
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { isPublished: req.body.isPublished },
      { new: true }
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/portal/exam/results/:id
router.delete('/results/:id', verifyExamToken, async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.json({ message: 'Result deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/exam/students  — for roll number / exam lookups
router.get('/students', verifyExamToken, async (req, res) => {
  try {
    const { department, program, status } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (status) filter.status = status;
    const students = await Student.find(filter).select('-password').sort({ registrationNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Correction Requests ──────────────────────────────────────────────────────
const CorrectionRequest = require('../models/CorrectionRequest');
const ResultSheet       = require('../models/ResultSheet');

// GET /api/portal/exam/correction-requests
router.get('/correction-requests', verifyExamToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await CorrectionRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/portal/exam/correction-requests/:id
router.delete('/correction-requests/:id', verifyExamToken, async (req, res) => {
  try {
    await CorrectionRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Correction request deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/portal/exam/correction-requests/:id
router.patch('/correction-requests/:id', verifyExamToken, async (req, res) => {
  try {
    const { status, reviewerComment } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be "approved" or "rejected".' });

    const cr = await CorrectionRequest.findById(req.params.id);
    if (!cr) return res.status(404).json({ message: 'Correction request not found.' });
    if (cr.status !== 'pending') return res.status(400).json({ message: 'This request has already been reviewed.' });

    cr.status          = status;
    cr.reviewedBy      = req.user.id;
    cr.reviewerRole    = 'exam';
    cr.reviewerComment = reviewerComment || '';
    cr.reviewedAt      = new Date();
    await cr.save();

    if (status === 'approved') {
      await ResultSheet.findByIdAndUpdate(cr.resultSheet, { status: 'draft' });
    }

    res.json({ message: `Correction request ${status}.`, request: cr });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Result Sheets (structured teacher results) ──────────────────────────────────
// GET /api/portal/exam/result-sheets
router.get('/result-sheets', verifyExamToken, async (req, res) => {
  try {
    const { department, program, semester, subject, academicSession, teacherId, status, examType } = req.query;
    const f = {};
    if (department)      f.department      = new RegExp(department, 'i');
    if (program)         f.program         = new RegExp(program, 'i');
    if (semester)        f.semester        = semester;
    if (subject)         f.subject         = new RegExp(subject, 'i');
    if (academicSession) f.academicSession = academicSession;
    if (teacherId)       f.teacherId       = teacherId;
    if (status)          f.status          = status;
    else                 f.status          = { $in: ['submitted', 'finalized'] };
    if (examType)        f.examType        = examType;
    const sheets = await ResultSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/exam/result-sheets/:id
router.get('/result-sheets/:id', verifyExamToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    res.json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/portal/exam/result-sheets/:id/finalize
// Body: { passingMarks: Number } — threshold out of 100; sets each entry's resultStatus to Pass/Fail
router.patch('/result-sheets/:id/finalize', verifyExamToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    if (sheet.status === 'draft') return res.status(400).json({ message: 'Only submitted result sheets can be finalized.' });

    const threshold = Number(req.body.passingMarks);
    if (!threshold || threshold < 1 || threshold > 100)
      return res.status(400).json({ message: 'Please provide a valid passing marks threshold (1–100).' });

    sheet.passingMarks = threshold;
    sheet.entries = sheet.entries.map(e => {
      const obj = e.toObject ? e.toObject() : { ...e };
      if (obj.resultStatus === 'Absent' || obj.resultStatus === 'Withheld') return obj;
      obj.resultStatus = obj.obtainedMarks >= threshold ? 'Pass' : 'Fail';
      return obj;
    });
    sheet.status      = 'finalized';
    sheet.finalizedAt = new Date();
    await sheet.save();
    res.json({ message: `Result sheet finalized. Passing threshold: ${threshold}/100.`, sheet });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/portal/exam/result-sheets/:id/revert
router.patch('/result-sheets/:id/revert', verifyExamToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Not found.' });
    if (sheet.status !== 'finalized') return res.status(400).json({ message: 'Only finalized sheets can be reverted.' });
    sheet.status      = 'submitted';
    sheet.finalizedAt = undefined;
    await sheet.save();
    res.json({ message: 'Reverted to submitted.', sheet });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Degree Verification ───────────────────────────────────────────────────────

// PUBLIC: GET /api/portal/exam/degree-verify?registrationNo=...
router.get('/degree-verify', async (req, res) => {
  try {
    const { registrationNo } = req.query;
    if (!registrationNo) return res.status(400).json({ message: 'Registration number is required.' });
    const record = await DegreeVerification.findOne({
      registrationNo: { $regex: `^${registrationNo.trim()}$`, $options: 'i' },
    });
    if (!record) return res.status(404).json({ message: 'No degree record found for this registration number.' });
    res.json(record);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// EXAM STAFF: GET /api/portal/exam/degrees
router.get('/degrees', verifyExamToken, async (req, res) => {
  try {
    const { search, department, degreeStatus } = req.query;
    const f = {};
    if (department)   f.department   = { $regex: department, $options: 'i' };
    if (degreeStatus) f.degreeStatus = degreeStatus;
    if (search) {
      f.$or = [
        { registrationNo: { $regex: search, $options: 'i' } },
        { fullName:       { $regex: search, $options: 'i' } },
      ];
    }
    const records = await DegreeVerification.find(f).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// EXAM STAFF: POST /api/portal/exam/degrees
router.post('/degrees', verifyExamToken, async (req, res) => {
  try {
    const { registrationNo, fullName, fatherName, department, program, session, graduationYear, cgpa, degreeStatus, remarks } = req.body;
    if (!registrationNo || !fullName || !department || !program)
      return res.status(400).json({ message: 'Registration No, Full Name, Department, and Program are required.' });
    const existing = await DegreeVerification.findOne({ registrationNo: { $regex: `^${registrationNo.trim()}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ message: 'A degree record with this registration number already exists.' });
    const record = await DegreeVerification.create({
      registrationNo: registrationNo.trim(), fullName, fatherName, department, program,
      session, graduationYear, cgpa, degreeStatus: degreeStatus || 'completed', remarks,
      issuedBy: req.user.id, issuedByRole: 'exam',
    });
    res.status(201).json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// EXAM STAFF: PATCH /api/portal/exam/degrees/:id
router.patch('/degrees/:id', verifyExamToken, async (req, res) => {
  try {
    const allowed = ['fullName','fatherName','department','program','session','graduationYear','cgpa','degreeStatus','remarks'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const record = await DegreeVerification.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    res.json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// EXAM STAFF: DELETE /api/portal/exam/degrees/:id
router.delete('/degrees/:id', verifyExamToken, async (req, res) => {
  try {
    await DegreeVerification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Degree record deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
