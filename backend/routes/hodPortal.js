const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const HOD     = require('../models/HOD');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { verifyHODToken } = require('../middleware/auth');
const { requiredString, optionalString, enumField, validate } = require('../validators');
const { escapeRegex } = require('../utils/escapeRegex');
const { authLimiter } = require('../middleware/rateLimiters');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');
const { logAudit } = require('../utils/audit');

const NOTICE_PRIORITY = ['normal', 'important', 'urgent'];
const REVIEW_STATUS = ['approved', 'rejected'];

// POST /api/portal/hod/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const hodId = String(req.body.hodId || '').trim().toUpperCase();
    const hod = await HOD.findOne({ hodId });
    if (!hod) return res.status(401).json({ message: 'Invalid credentials.' });

    if (hod.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact admin.' });

    if (isLocked(hod)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(hod)} minute(s).` });
    }

    const valid = await bcrypt.compare(password, hod.password);
    if (!valid) {
      await recordFailedAttempt(hod);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    await resetFailedAttempts(hod);

    if (hod.status === 'inactive') return res.status(403).json({ message: 'Your account is inactive. Contact admin.' });

    const token = jwt.sign(
      { id: hod._id, role: 'hod', hodId: hod.hodId, department: hod.department, tokenVersion: hod.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    const hodData = hod.toObject();
    delete hodData.password;
    res.json({ token, hod: hodData });
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/hod/profile
router.get('/profile', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('-password');
    if (!hod) return res.status(404).json({ message: 'HOD not found.' });
    res.json(hod);
  } catch (err) {
    res.sendServerError(err);
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
    res.sendServerError(err);
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
    res.sendServerError(err);
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
    res.sendServerError(err);
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
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/hod/correction-requests/:id  (approve or reject)
router.patch('/correction-requests/:id', verifyHODToken, [
  enumField('status', REVIEW_STATUS),
  optionalString('reviewerComment', { max: 1000 }),
  validate,
], async (req, res) => {
  try {
    const { status, reviewerComment } = req.body;

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

    await logAudit(req, {
      action: `correctionRequest.${status}`, entityType: 'CorrectionRequest', entityId: cr._id,
      entityLabel: `${cr.subject || ''}`, before: { status: 'pending' }, after: { status, reviewerComment: cr.reviewerComment },
    });

    res.json({ message: `Correction request ${status}.`, request: cr });
  } catch (err) { res.sendServerError(err); }
});

// ── Department Result Sheets ─────────────────────────────────────────────────────
// GET /api/portal/hod/result-sheets
router.get('/result-sheets', verifyHODToken, async (req, res) => {
  try {
    const hod = await require('../models/HOD').findById(req.user.id).select('department');
    if (!hod) return res.status(404).json({ message: 'HOD not found.' });
    const { semester, status, subject, examType } = req.query;
    const f = { department: new RegExp(escapeRegex(hod.department), 'i') };
    if (semester) f.semester = semester;
    if (subject)  f.subject  = new RegExp(escapeRegex(subject), 'i');
    if (examType) f.examType = examType;
    if (status)   f.status   = status;
    else          f.status   = { $in: ['submitted', 'finalized'] };
    const sheets = await ResultSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/result-sheets/:id
router.get('/result-sheets/:id', verifyHODToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Not found.' });
    if (!new RegExp(`^${escapeRegex(req.user.department)}$`, 'i').test(sheet.department || '')) {
      return res.status(404).json({ message: 'Not found.' });
    }
    res.json(sheet);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/ongoing-classes  (dept-filtered)
const OngoingClass = require('../models/OngoingClass');
router.get('/ongoing-classes', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const f = { department: { $regex: escapeRegex(hod.department), $options: 'i' } };
    const { semester, status, timeSession } = req.query;
    if (semester)    f.semester    = semester;
    if (status)      f.status      = status;
    if (timeSession) f.timeSession = timeSession;
    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/datesheets  (dept-filtered published)
const DateSheet = require('../models/DateSheet');
router.get('/datesheets', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const f = { department: { $regex: escapeRegex(hod.department), $options: 'i' } };
    const { semester, examType, isPublished } = req.query;
    if (semester) f.semester = semester;
    if (examType) f.examType = examType;
    if (isPublished !== undefined) f.isPublished = isPublished === 'true';
    const sheets = await DateSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.sendServerError(err); }
});

// ── Department Notices ─────────────────────────────────────────────────────
const DeptNotice = require('../models/DeptNotice');
const { createUpload } = require('../utils/cloudinary');
const noticeUpload = createUpload('portal/hod-notices');

// The create/edit form sends multipart/form-data (so file attachments can
// ride along), which means every non-file field — including `audience`,
// a nested object — arrives as a string. This parses it back to an object
// and drops anything that doesn't match the expected shape.
function parseAudienceInput(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    return {};
  }
}

// departments is always pinned to the HOD's own department — HODs can only
// ever post within their own department, so there's no UI for picking it;
// the field exists on the schema for a future cross-department notice type.
function sanitizeAudience(raw, hodDepartmentId) {
  const a = parseAudienceInput(raw);
  const toObjectIds = (arr) => (Array.isArray(arr) ? arr : [])
    .filter((v) => mongoose.isValidObjectId(v));
  const toSemesters = (arr) => (Array.isArray(arr) ? arr : [])
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 8);
  const toRoles = (arr) => (Array.isArray(arr) ? arr : [])
    .filter((v) => ['student', 'teacher', 'all'].includes(v));

  return {
    departments: hodDepartmentId ? [hodDepartmentId] : [],
    programs: toObjectIds(a.programs),
    semesters: toSemesters(a.semesters),
    roles: toRoles(a.roles),
  };
}

// GET /api/portal/hod/notices
router.get('/notices', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department fullName');
    const notices = await DeptNotice.find({ department: hod.department }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/hod/notices
router.post('/notices', verifyHODToken, noticeUpload.array('files', 5), [
  requiredString('title', { max: 200 }),
  optionalString('body', { max: 5000 }),
  enumField('priority', NOTICE_PRIORITY, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId fullName');
    const { title, body, priority, isPublished, publishAt, expiresAt } = req.body;
    const attachments = (req.files || []).map((f) => ({ fileUrl: f.path, fileName: f.originalname }));
    const notice = new DeptNotice({
      title, body: body || '',
      department: hod.department,
      postedBy: req.user.id,
      postedByName: hod.fullName || '',
      priority: priority || 'normal',
      isPublished: isPublished !== 'false' && isPublished !== false,
      publishAt: publishAt ? new Date(publishAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      audience: sanitizeAudience(req.body.audience, hod.departmentId),
      attachments,
    });
    await notice.save();
    await logAudit(req, {
      action: 'deptNotice.create', entityType: 'DeptNotice', entityId: notice._id,
      entityLabel: `${notice.title} — ${notice.department}`,
      after: { priority: notice.priority, expiresAt: notice.expiresAt, attachments: notice.attachments.length },
    });
    res.status(201).json(notice);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/hod/notices/:id
router.patch('/notices/:id', verifyHODToken, noticeUpload.array('files', 5), [
  optionalString('title', { max: 200 }),
  optionalString('body', { max: 5000 }),
  enumField('priority', NOTICE_PRIORITY, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    const notice = await DeptNotice.findOne({ _id: req.params.id, department: hod.department });
    if (!notice) return res.status(404).json({ message: 'Notice not found.' });
    const { title, body, priority, isPublished, publishAt, expiresAt, removeAttachments } = req.body;
    if (title !== undefined) notice.title = title;
    if (body !== undefined) notice.body = body;
    if (priority !== undefined) notice.priority = priority;
    if (isPublished !== undefined) notice.isPublished = isPublished === 'true' || isPublished === true;
    if (publishAt !== undefined) notice.publishAt = publishAt ? new Date(publishAt) : new Date();
    if (expiresAt !== undefined) notice.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (req.body.audience !== undefined) notice.audience = sanitizeAudience(req.body.audience, hod.departmentId);

    if (removeAttachments) {
      let toRemove = [];
      try { toRemove = JSON.parse(removeAttachments); } catch { toRemove = []; }
      if (Array.isArray(toRemove) && toRemove.length) {
        notice.attachments = (notice.attachments || []).filter((a) => !toRemove.includes(a.fileUrl));
      }
    }
    if (req.files && req.files.length) {
      const newAttachments = req.files.map((f) => ({ fileUrl: f.path, fileName: f.originalname }));
      notice.attachments = [...(notice.attachments || []), ...newAttachments];
    }

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
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
