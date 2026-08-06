const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const DateSheet = require('../models/DateSheet');
const Result = require('../models/Result');
const TeacherIdSlot = require('../models/TeacherIdSlot');
const Department = require('../models/Department');
const Program = require('../models/Program');
const { verifyAdminToken } = require('../middleware/auth');

const { createUpload } = require('../utils/cloudinary');
const upload = createUpload('portal/admin');

const {
  cnic, phone, personName, email, password: passwordChain,
  teacherId: teacherIdChain, hodId: hodIdChain, examId: examIdChain, financeId: financeIdChain,
  requiredString, optionalString, mongoId, numberInRange, enumField, validate, enums,
  resolveRef, refFilters, departmentRef, programRef, sessionRef, designationRef, snapshotRefs,
} = require('../validators');
const { escapeRegex } = require('../utils/escapeRegex');
const { isDuplicateKeyError, duplicateKeyMessage } = require('../utils/duplicateKey');
const { authLimiter } = require('../middleware/rateLimiters');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');
const { logAudit } = require('../utils/audit');
const {
  studentHasLinkedRecords, teacherHasLinkedRecords, hodHasLinkedRecords,
  examStaffHasLinkedRecords, financeStaffHasLinkedRecords,
} = require('../utils/linkedRecordsCheck');

// Registers PATCH base/:id/archive, PATCH base/:id/restore, and
// DELETE base/:id/permanent for an account-type model. Archiving is the
// normal path (soft delete — login blocked, hidden from default lists,
// reversible via /restore); permanent deletion requires the requesting
// admin's own password and is refused if the record has any linked activity
// (results, attendance, fees, ...) so history never silently disappears.
function registerAccountArchiveRoutes({ base, Model, entityType, hasLinkedRecords }) {
  router.patch(`${base}/:id/archive`, verifyAdminToken, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${entityType} not found.` });
      if (doc.isActive === false) return res.status(400).json({ message: `${entityType} is already archived.` });

      const before = { isActive: doc.isActive, status: doc.status };
      doc.isActive = false;
      doc.archivedAt = new Date();
      doc.archivedBy = req.user.id;
      doc.tokenVersion = (doc.tokenVersion || 0) + 1; // kill any live session immediately
      await doc.save();

      await logAudit(req, {
        action: `${entityType}.archive`, entityType, entityId: doc._id, entityLabel: doc.fullName || '',
        before, after: { isActive: false, archivedAt: doc.archivedAt },
      });

      const record = doc.toObject(); delete record.password;
      res.json({ message: `${entityType} archived.`, record });
    } catch (err) { res.sendServerError(err); }
  });

  router.patch(`${base}/:id/restore`, verifyAdminToken, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${entityType} not found.` });
      if (doc.isActive !== false) return res.status(400).json({ message: `${entityType} is not archived.` });

      const before = { isActive: doc.isActive, archivedAt: doc.archivedAt };
      doc.isActive = true;
      doc.archivedAt = null;
      doc.archivedBy = null;
      await doc.save();

      await logAudit(req, {
        action: `${entityType}.restore`, entityType, entityId: doc._id, entityLabel: doc.fullName || '',
        before, after: { isActive: true },
      });

      const record = doc.toObject(); delete record.password;
      res.json({ message: `${entityType} restored.`, record });
    } catch (err) { res.sendServerError(err); }
  });

  router.delete(`${base}/:id/permanent`, verifyAdminToken, [requiredString('password', { max: 200 }), validate], async (req, res) => {
    try {
      const requestingAdmin = await Admin.findById(req.user.id);
      if (!requestingAdmin) return res.status(404).json({ message: 'Admin not found.' });
      const passwordOk = await bcrypt.compare(req.body.password, requestingAdmin.password);
      if (!passwordOk) return res.status(401).json({ message: 'Incorrect password.' });

      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: `${entityType} not found.` });

      if (await hasLinkedRecords(doc)) {
        return res.status(409).json({ message: `Cannot permanently delete this ${entityType}: it has linked records (results, attendance, fees, etc). Archive it instead.` });
      }

      const before = doc.toObject(); delete before.password;
      await Model.findByIdAndDelete(doc._id);

      await logAudit(req, {
        action: `${entityType}.hard_delete`, entityType, entityId: doc._id, entityLabel: doc.fullName || '',
        before, after: null,
      });

      res.json({ message: `${entityType} permanently deleted.` });
    } catch (err) { res.sendServerError(err); }
  });
}

// POST /api/portal/admin/login
// NOTE: routes/twoFactor.js exposes a parallel, 2FA-aware /api/2fa/login that
// supersedes this one for accounts with 2FA enabled; this endpoint stays for
// accounts without 2FA and carries the same rate-limit/lockout hardening.
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials.' });

    if (admin.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact another admin.' });

    if (isLocked(admin)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(admin)} minute(s).` });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      await recordFailedAttempt(admin);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    await resetFailedAttempts(admin);

    const token = jwt.sign(
      { id: admin._id, role: 'admin', email: admin.email, tokenVersion: admin.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    const adminData = admin.toObject();
    delete adminData.password;
    res.json({ token, admin: adminData });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/admin/stats
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalStudents, activeStudents, pendingStudents, suspendedStudents,
      totalTeachers, pendingTeachers,
      hodCount, examCount, financeCount, adminCount,
      pendingAdmissions, pendingCorrectionRequests,
      unpaidChallanAgg,
      recentStudentRegistrations, recentTeacherRegistrations,
      recentActivity,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'approved' }),
      Student.countDocuments({ status: 'pending' }),
      Student.countDocuments({ status: 'suspended' }),
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'pending' }),
      HOD.countDocuments({ isActive: { $ne: false } }),
      ExaminationStaff.countDocuments({ isActive: { $ne: false } }),
      FinanceStaff.countDocuments({ isActive: { $ne: false } }),
      Admin.countDocuments(),
      Admission.countDocuments({ status: 'pending' }),
      CorrectionRequest.countDocuments({ status: 'pending' }),
      FeeChallan.aggregate([
        { $match: { status: 'generated' } },
        { $group: { _id: null, count: { $sum: 1 }, outstandingAmount: { $sum: '$totalAmount' } } },
      ]),
      Student.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Teacher.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      AuditLog.find().sort({ createdAt: -1 }).limit(15),
    ]);

    const unpaidChallans = unpaidChallanAgg[0]?.count || 0;
    const outstandingAmount = unpaidChallanAgg[0]?.outstandingAmount || 0;

    res.json({
      totalStudents, activeStudents, pendingStudents, suspendedStudents,
      totalTeachers, pendingTeachers,
      staffCounts: { hod: hodCount, exam: examCount, finance: financeCount, admin: adminCount },
      pendingAdmissions, pendingCorrectionRequests,
      unpaidChallans, outstandingAmount,
      recentRegistrations: { students: recentStudentRegistrations, teachers: recentTeacherRegistrations },
      recentActivity,
    });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/admin/students?page=&limit=
router.get('/students', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, program, search, includeArchived, page, limit } = req.query;
    const filter = {};
    if (includeArchived !== 'true') filter.isActive = { $ne: false };
    if (status && status !== 'all') filter.status = status;
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (search) {
      filter.$or = [
        { fullName: { $regex: escapeRegex(search), $options: 'i' } },
        { registrationNo: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [data, total] = await Promise.all([
      Student.find(filter).select('-password').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Student.countDocuments(filter),
    ]);
    res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/students/:id/status
router.patch('/students/:id/status', verifyAdminToken, [
  enumField('status', enums.STUDENT_STATUS), validate,
], async (req, res) => {
  try {
    const { status } = req.body;
    const before = await Student.findById(req.params.id).select('status fullName');
    if (!before) return res.status(404).json({ message: 'Student not found.' });
    // Bumping tokenVersion invalidates any token already issued to this
    // account — e.g. suspending a student cuts off their current session
    // immediately instead of waiting for the token to expire.
    const student = await Student.findByIdAndUpdate(
      req.params.id, { $set: { status }, $inc: { tokenVersion: 1 } }, { new: true }
    ).select('-password');
    await logAudit(req, {
      action: `student.status_${status}`, entityType: 'Student', entityId: student._id, entityLabel: student.fullName,
      before: { status: before.status }, after: { status },
    });
    res.json({ message: `Student status updated to ${status}.`, student });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/students/:id/academic — update CGPA, attendance, roll no, semester
router.patch('/students/:id/academic', verifyAdminToken, [
  optionalString('rollNo', { max: 30 }),
  numberInRange('currentSemester', { min: 1, max: 10 }),
  numberInRange('cgpa', { min: 0, max: 4 }),
  numberInRange('attendancePercentage', { min: 0, max: 100 }),
  validate,
], async (req, res) => {
  try {
    const allowed = ['rollNo', 'currentSemester', 'cgpa', 'attendancePercentage'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const before = await Student.findById(req.params.id).select(`${allowed.join(' ')} fullName`);
    if (!before) return res.status(404).json({ message: 'Student not found.' });
    const student = await Student.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    ).select('-password');
    await logAudit(req, {
      action: 'student.academic_update', entityType: 'Student', entityId: student._id, entityLabel: student.fullName,
      before: Object.fromEntries(Object.keys(updates).map((f) => [f, before[f]])),
      after: updates,
    });
    res.json({ message: 'Academic info updated.', student });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

registerAccountArchiveRoutes({ base: '/students', Model: Student, entityType: 'Student', hasLinkedRecords: studentHasLinkedRecords });

// GET /api/portal/admin/students/advance-semester/preview
// Returns list of students that would be advanced
router.get('/students/advance-semester/preview', verifyAdminToken, async (req, res) => {
  try {
    const { department, session, semester } = req.query;
    if (!department || !session || !semester) {
      return res.status(400).json({ message: 'department, session and semester are required.' });
    }
    const filter = {
      status: 'approved',
      currentSemester: Number(semester),
      department: { $regex: escapeRegex(department.trim()), $options: 'i' },
      session: { $regex: escapeRegex(session.trim()), $options: 'i' },
    };
    const students = await Student.find(filter)
      .select('_id fullName registrationNo rollNo department program session currentSemester')
      .sort({ fullName: 1 });
    res.json({ count: students.length, students });
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/admin/students/advance-semester
// Increments currentSemester for specific student IDs (selected list)
router.post('/students/advance-semester', verifyAdminToken, async (req, res) => {
  try {
    const { studentIds, fromSemester } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'studentIds array is required.' });
    }
    if (!fromSemester) {
      return res.status(400).json({ message: 'fromSemester is required.' });
    }
    const from = Number(fromSemester);
    if (from < 1 || from > 7) {
      return res.status(400).json({ message: 'fromSemester must be between 1 and 7.' });
    }
    const result = await Student.updateMany(
      { _id: { $in: studentIds }, currentSemester: from },
      { $inc: { currentSemester: 1 } }
    );
    res.json({
      message: `${result.modifiedCount} student(s) advanced from Semester ${from} to Semester ${from + 1}.`,
      count: result.modifiedCount,
    });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/admin/teachers?page=&limit=
router.get('/teachers', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, search, includeArchived, page, limit } = req.query;
    const filter = {};
    if (includeArchived !== 'true') filter.isActive = { $ne: false };
    if (status && status !== 'all') filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { fullName: { $regex: escapeRegex(search), $options: 'i' } },
        { teacherId: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [data, total] = await Promise.all([
      Teacher.find(filter).select('-password').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Teacher.countDocuments(filter),
    ]);
    res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/teachers/:id/status
router.patch('/teachers/:id/status', verifyAdminToken, [
  enumField('status', enums.TEACHER_STATUS), validate,
], async (req, res) => {
  try {
    const { status } = req.body;
    const before = await Teacher.findById(req.params.id).select('status fullName');
    if (!before) return res.status(404).json({ message: 'Teacher not found.' });
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id, { $set: { status }, $inc: { tokenVersion: 1 } }, { new: true }
    ).select('-password');
    await logAudit(req, {
      action: `teacher.status_${status}`, entityType: 'Teacher', entityId: teacher._id, entityLabel: teacher.fullName,
      before: { status: before.status }, after: { status },
    });
    res.json({ message: `Teacher status updated to ${status}.`, teacher });
  } catch (error) {
    res.sendServerError(error);
  }
});

registerAccountArchiveRoutes({ base: '/teachers', Model: Teacher, entityType: 'Teacher', hasLinkedRecords: teacherHasLinkedRecords });

// GET /api/portal/admin/teacher-ids
router.get('/teacher-ids', verifyAdminToken, async (req, res) => {
  try {
    const slots = await TeacherIdSlot.find().sort({ createdAt: -1 });
    res.json(slots);
  } catch (error) {
    res.sendServerError(error);
  }
});

// POST /api/portal/admin/teacher-ids
router.post('/teacher-ids', verifyAdminToken, [teacherIdChain('teacherId'), validate], async (req, res) => {
  try {
    const { teacherId } = req.body;
    const slot = new TeacherIdSlot({ teacherId });
    await slot.save();
    res.status(201).json({ message: 'Teacher ID created successfully.', slot });
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(400).json({ message: duplicateKeyMessage(error) });
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/teacher-ids/:id
router.patch('/teacher-ids/:id', verifyAdminToken, [teacherIdChain('teacherId'), validate], async (req, res) => {
  try {
    const { teacherId } = req.body;
    const slot = await TeacherIdSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Teacher ID not found.' });
    if (slot.isUsed) return res.status(400).json({ message: 'Cannot edit a Teacher ID that is already in use by a registered teacher.' });
    slot.teacherId = teacherId;
    await slot.save();
    res.json({ message: 'Teacher ID updated successfully.', slot });
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(400).json({ message: duplicateKeyMessage(error) });
    res.sendServerError(error);
  }
});

// DELETE /api/portal/admin/teacher-ids/:id
router.delete('/teacher-ids/:id', verifyAdminToken, async (req, res) => {
  try {
    const slot = await TeacherIdSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Teacher ID not found.' });
    res.json({ message: 'Teacher ID deleted successfully.' });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/admin/datesheets  (with optional filters)
router.get('/datesheets', verifyAdminToken, async (req, res) => {
  try {
    const { department, program, semester, examType, session, timeSession, isPublished } = req.query;
    const f = {};
    if (department)  f.department  = { $regex: escapeRegex(department),  $options: 'i' };
    if (program)     f.program     = { $regex: escapeRegex(program),     $options: 'i' };
    if (semester)    f.semester    = semester;
    if (examType)    f.examType    = examType;
    if (session)     f.session     = { $regex: escapeRegex(session),     $options: 'i' };
    if (timeSession) f.timeSession = timeSession;
    if (isPublished !== undefined) f.isPublished = isPublished === 'true';
    const datesheets = await DateSheet.find(f).sort({ createdAt: -1 });

    const teacherIds = [...new Set(
      datesheets.filter(d => d.uploadedByRole === 'teacher' && d.uploadedBy)
                .map(d => d.uploadedBy.toString())
    )];
    const adminIds = [...new Set(
      datesheets.filter(d => d.uploadedByRole === 'admin' && d.uploadedBy)
                .map(d => d.uploadedBy.toString())
    )];
    const [teachers, admins] = await Promise.all([
      teacherIds.length ? Teacher.find({ _id: { $in: teacherIds } }).select('fullName') : Promise.resolve([]),
      adminIds.length   ? Admin.find({ _id: { $in: adminIds } }).select('name email') : Promise.resolve([]),
    ]);
    const teacherMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.fullName]));
    const adminMap   = Object.fromEntries(admins.map(a => [a._id.toString(), a.name || a.email]));

    const enriched = datesheets.map(d => {
      const obj = d.toObject();
      if (d.uploadedByRole === 'teacher') obj.uploaderName = teacherMap[d.uploadedBy?.toString()] || 'Unknown Teacher';
      else if (d.uploadedByRole === 'admin') obj.uploaderName = adminMap[d.uploadedBy?.toString()] || 'Admin';
      return obj;
    });

    res.json(enriched);
  } catch (error) {
    res.sendServerError(error);
  }
});

// POST /api/portal/admin/datesheets
router.post('/datesheets', verifyAdminToken, upload.single('file'), [
  requiredString('title', { max: 200 }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession } = req.body;
    const datesheet = new DateSheet(snapshotRefs(req, {
      title, examType, semester, department, program, session, timeSession: timeSession || undefined,
      uploadedBy: req.user.id,
      uploadedByRole: 'admin',
      fileUrl: req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
    }));
    await datesheet.save();
    res.status(201).json({ message: 'Date sheet uploaded successfully.', datesheet });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/datesheets/:id  (edit)
router.patch('/datesheets/:id', verifyAdminToken, upload.single('file'), [
  optionalString('title', { max: 200 }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession } = req.body;
    const ds = await DateSheet.findById(req.params.id);
    if (!ds) return res.status(404).json({ message: 'Date sheet not found.' });
    if (title)                        ds.title       = title;
    if (examType)                     ds.examType    = examType;
    if (semester  !== undefined)      ds.semester    = semester;
    if (department !== undefined && !req.resolvedRefs?.department) ds.department = department;
    if (program   !== undefined && !req.resolvedRefs?.program)     ds.program    = program;
    if (session   !== undefined && !req.resolvedRefs?.session)     ds.session    = session;
    if (timeSession !== undefined)    ds.timeSession = timeSession || undefined;
    const refs = snapshotRefs(req, {});
    Object.assign(ds, refs);
    if (req.file) { ds.fileUrl = req.file.path; ds.fileName = req.file.originalname; }
    await ds.save();
    res.json({ message: 'Date sheet updated.', datesheet: ds });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/datesheets/:id/publish
router.patch('/datesheets/:id/publish', verifyAdminToken, async (req, res) => {
  try {
    const datesheet = await DateSheet.findById(req.params.id);
    if (!datesheet) return res.status(404).json({ message: 'Date sheet not found.' });
    datesheet.isPublished = !datesheet.isPublished;
    await datesheet.save();
    res.json({ message: `Date sheet ${datesheet.isPublished ? 'published' : 'unpublished'}.`, datesheet });
  } catch (error) {
    res.sendServerError(error);
  }
});

// DELETE /api/portal/admin/datesheets/:id
router.delete('/datesheets/:id', verifyAdminToken, async (req, res) => {
  try {
    const ds = await DateSheet.findByIdAndDelete(req.params.id);
    if (!ds) return res.status(404).json({ message: 'Date sheet not found.' });
    res.json({ message: 'Date sheet deleted.' });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/admin/results
router.get('/results', verifyAdminToken, async (req, res) => {
  try {
    const results = await Result.find().sort({ createdAt: -1 });

    const teacherIds = [...new Set(
      results.filter(r => r.uploadedByRole === 'teacher' && r.uploadedBy)
             .map(r => r.uploadedBy.toString())
    )];
    const adminIds = [...new Set(
      results.filter(r => r.uploadedByRole === 'admin' && r.uploadedBy)
             .map(r => r.uploadedBy.toString())
    )];

    const [teachers, admins] = await Promise.all([
      teacherIds.length ? Teacher.find({ _id: { $in: teacherIds } }).select('fullName') : Promise.resolve([]),
      adminIds.length   ? Admin.find({ _id: { $in: adminIds } }).select('name email') : Promise.resolve([]),
    ]);

    const teacherMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.fullName]));
    const adminMap   = Object.fromEntries(admins.map(a => [a._id.toString(), a.name || a.email]));

    const enriched = results.map(r => {
      const obj = r.toObject();
      if (r.uploadedByRole === 'teacher') obj.uploaderName = teacherMap[r.uploadedBy?.toString()] || 'Unknown Teacher';
      else if (r.uploadedByRole === 'admin') obj.uploaderName = adminMap[r.uploadedBy?.toString()] || 'Admin';
      return obj;
    });

    res.json(enriched);
  } catch (error) {
    res.sendServerError(error);
  }
});

// POST /api/portal/admin/results
router.post('/results', verifyAdminToken, upload.single('file'), [
  requiredString('title', { max: 200 }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession, results } = req.body;
    const result = new Result(snapshotRefs(req, {
      title, examType, semester, department, program, session, timeSession: timeSession || undefined,
      uploadedBy: req.user.id,
      uploadedByRole: 'admin',
      fileUrl: req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
      results: results ? JSON.parse(results) : [],
    }));
    await result.save();
    res.status(201).json({ message: 'Results uploaded successfully.', result });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/admin/results/:id/publish
router.patch('/results/:id/publish', verifyAdminToken, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    const before = result.isPublished;
    result.isPublished = !result.isPublished;
    await result.save();
    await logAudit(req, {
      action: result.isPublished ? 'result.publish' : 'result.unpublish', entityType: 'Result', entityId: result._id,
      entityLabel: result.title || '', before: { isPublished: before }, after: { isPublished: result.isPublished },
    });
    res.json({ message: `Result ${result.isPublished ? 'published' : 'unpublished'}.`, result });
  } catch (error) {
    res.sendServerError(error);
  }
});

// ══════════════════════════════════════════════════════
// STAFF MANAGEMENT  (HOD / Exam Section / Finance)
// ══════════════════════════════════════════════════════
const HOD            = require('../models/HOD');
const ExaminationStaff = require('../models/ExaminationStaff');
const FinanceStaff   = require('../models/FinanceStaff');

const HOD_STAFF_FIELDS = ['fullName', 'email', 'phone', 'cnic', 'department', 'designation', 'qualification', 'status'];

// ── HOD ──────────────────────────────────────────────
router.get('/staff/hod', verifyAdminToken, async (req, res) => {
  try {
    const filter = req.query.includeArchived === 'true' ? {} : { isActive: { $ne: false } };
    const pageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [data, total] = await Promise.all([
      HOD.find(filter).select('-password').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      HOD.countDocuments(filter),
    ]);
    res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (err) { res.sendServerError(err); }
});

router.post('/staff/hod', verifyAdminToken, [
  hodIdChain('hodId'),
  personName('fullName'),
  email('email'),
  passwordChain('password'),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  departmentRef({ optional: false }),
  designationRef({ optional: true }),
  optionalString('qualification', { max: 200 }),
  validate,
], async (req, res) => {
  try {
    const { hodId, fullName, email, password, phone, cnic, qualification } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const data = snapshotRefs(req, { hodId, fullName, email, phone, cnic, qualification, password: hashed });
    const hod = await new HOD(data).save();
    const result = hod.toObject(); delete result.password;
    await logAudit(req, {
      action: 'hod.create', entityType: 'HOD', entityId: hod._id, entityLabel: hod.fullName, after: result,
    });
    res.status(201).json(result);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/hod/:id', verifyAdminToken, [
  personName('fullName', { optional: true }),
  email('email', { optional: true }),
  passwordChain('password', { optional: true }),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  departmentRef({ optional: true }),
  designationRef({ optional: true }),
  optionalString('qualification', { max: 200 }),
  enumField('status', enums.STAFF_STATUS, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const before = await HOD.findById(req.params.id).select('-password');
    if (!before) return res.status(404).json({ message: 'HOD not found.' });
    const updates = {};
    HOD_STAFF_FIELDS.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    delete updates.department;
    delete updates.designation;
    snapshotRefs(req, updates);
    // A password reset or status change invalidates this account's existing tokens.
    if (req.body.password || req.body.status !== undefined) updates.$inc = { tokenVersion: 1 };
    if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 10);
    const hod = await HOD.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    const auditUpdates = { ...updates }; delete auditUpdates.$inc; delete auditUpdates.password;
    await logAudit(req, {
      action: 'hod.update', entityType: 'HOD', entityId: hod._id, entityLabel: hod.fullName,
      before: Object.fromEntries(Object.keys(auditUpdates).map((f) => [f, before[f]])), after: auditUpdates,
    });
    res.json(hod);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

registerAccountArchiveRoutes({ base: '/staff/hod', Model: HOD, entityType: 'HOD', hasLinkedRecords: hodHasLinkedRecords });

// ── Examination Staff ─────────────────────────────────
router.get('/staff/exam', verifyAdminToken, async (req, res) => {
  try {
    const filter = req.query.includeArchived === 'true' ? {} : { isActive: { $ne: false } };
    const pageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [data, total] = await Promise.all([
      ExaminationStaff.find(filter).select('-password').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      ExaminationStaff.countDocuments(filter),
    ]);
    res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (err) { res.sendServerError(err); }
});

const EXAM_STAFF_FIELDS = ['fullName', 'email', 'phone', 'cnic', 'designation', 'section', 'status'];

router.post('/staff/exam', verifyAdminToken, [
  examIdChain('examId'),
  personName('fullName'),
  email('email'),
  passwordChain('password'),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  designationRef({ optional: true }),
  optionalString('section', { max: 120 }),
  validate,
], async (req, res) => {
  try {
    const { examId, fullName, email, password, phone, cnic, section } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const data = snapshotRefs(req, { examId, fullName, email, phone, cnic, section, password: hashed });
    const staff = await new ExaminationStaff(data).save();
    const result = staff.toObject(); delete result.password;
    await logAudit(req, {
      action: 'examStaff.create', entityType: 'ExaminationStaff', entityId: staff._id, entityLabel: staff.fullName, after: result,
    });
    res.status(201).json(result);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/exam/:id', verifyAdminToken, [
  personName('fullName', { optional: true }),
  email('email', { optional: true }),
  passwordChain('password', { optional: true }),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  designationRef({ optional: true }),
  optionalString('section', { max: 120 }),
  enumField('status', enums.STAFF_STATUS, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const before = await ExaminationStaff.findById(req.params.id).select('-password');
    if (!before) return res.status(404).json({ message: 'Exam staff not found.' });
    const updates = {};
    EXAM_STAFF_FIELDS.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    delete updates.designation;
    snapshotRefs(req, updates);
    if (req.body.password || req.body.status !== undefined) updates.$inc = { tokenVersion: 1 };
    if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 10);
    const staff = await ExaminationStaff.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    const auditUpdates = { ...updates }; delete auditUpdates.$inc; delete auditUpdates.password;
    await logAudit(req, {
      action: 'examStaff.update', entityType: 'ExaminationStaff', entityId: staff._id, entityLabel: staff.fullName,
      before: Object.fromEntries(Object.keys(auditUpdates).map((f) => [f, before[f]])), after: auditUpdates,
    });
    res.json(staff);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

registerAccountArchiveRoutes({ base: '/staff/exam', Model: ExaminationStaff, entityType: 'ExaminationStaff', hasLinkedRecords: examStaffHasLinkedRecords });

// ── Finance Staff ─────────────────────────────────────
router.get('/staff/finance', verifyAdminToken, async (req, res) => {
  try {
    const filter = req.query.includeArchived === 'true' ? {} : { isActive: { $ne: false } };
    const pageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [data, total] = await Promise.all([
      FinanceStaff.find(filter).select('-password').sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      FinanceStaff.countDocuments(filter),
    ]);
    res.json({ data, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (err) { res.sendServerError(err); }
});

const FINANCE_STAFF_FIELDS = ['fullName', 'email', 'phone', 'cnic', 'designation', 'department', 'status'];

router.post('/staff/finance', verifyAdminToken, [
  financeIdChain('financeId'),
  personName('fullName'),
  email('email'),
  passwordChain('password'),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  designationRef({ optional: true }),
  departmentRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const { financeId, fullName, email, password, phone, cnic } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const data = snapshotRefs(req, { financeId, fullName, email, phone, cnic, password: hashed });
    const staff = await new FinanceStaff(data).save();
    const result = staff.toObject(); delete result.password;
    await logAudit(req, {
      action: 'financeStaff.create', entityType: 'FinanceStaff', entityId: staff._id, entityLabel: staff.fullName, after: result,
    });
    res.status(201).json(result);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/finance/:id', verifyAdminToken, [
  personName('fullName', { optional: true }),
  email('email', { optional: true }),
  passwordChain('password', { optional: true }),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  designationRef({ optional: true }),
  departmentRef({ optional: true }),
  enumField('status', enums.STAFF_STATUS, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const before = await FinanceStaff.findById(req.params.id).select('-password');
    if (!before) return res.status(404).json({ message: 'Finance staff not found.' });
    const updates = {};
    FINANCE_STAFF_FIELDS.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    delete updates.designation;
    delete updates.department;
    snapshotRefs(req, updates);
    if (req.body.password || req.body.status !== undefined) updates.$inc = { tokenVersion: 1 };
    if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 10);
    const staff = await FinanceStaff.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    const auditUpdates = { ...updates }; delete auditUpdates.$inc; delete auditUpdates.password;
    await logAudit(req, {
      action: 'financeStaff.update', entityType: 'FinanceStaff', entityId: staff._id, entityLabel: staff.fullName,
      before: Object.fromEntries(Object.keys(auditUpdates).map((f) => [f, before[f]])), after: auditUpdates,
    });
    res.json(staff);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

registerAccountArchiveRoutes({ base: '/staff/finance', Model: FinanceStaff, entityType: 'FinanceStaff', hasLinkedRecords: financeStaffHasLinkedRecords });

// ══════════════════════════════════════════════════════
// ONGOING CLASSES
// ══════════════════════════════════════════════════════
const OngoingClass = require('../models/OngoingClass');

// GET /api/portal/admin/ongoing-classes
router.get('/ongoing-classes', verifyAdminToken, async (req, res) => {
  try {
    const { department, program, semester, status, academicSession, timeSession } = req.query;
    const f = {};
    if (department)     f.department     = { $regex: escapeRegex(department),     $options: 'i' };
    if (program)        f.program        = { $regex: escapeRegex(program),        $options: 'i' };
    if (semester)       f.semester       = semester;
    if (status)         f.status         = status;
    if (academicSession)f.academicSession= { $regex: escapeRegex(academicSession),$options: 'i' };
    if (timeSession)    f.timeSession    = timeSession;
    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.sendServerError(err); }
});

const ONGOING_CLASS_STATUS = ['active', 'completed', 'cancelled', 'on-hold'];
const ONGOING_CLASS_FIELDS = [
  'className', 'subject', 'semester', 'timeSession',
  'teacher', 'teacherName', 'teacherId', 'days', 'startTime', 'endTime', 'room', 'location',
  'weeklyHours', 'maxStudents', 'status',
];

// POST /api/portal/admin/ongoing-classes
router.post('/ongoing-classes', verifyAdminToken, [
  requiredString('className', { max: 120 }),
  requiredString('subject', { max: 120 }),
  departmentRef({ optional: false }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  enumField('status', ONGOING_CLASS_STATUS, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const data = {};
    ONGOING_CLASS_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    snapshotRefs(req, data);
    const cls = await new OngoingClass({ ...data, createdBy: req.user.id, createdByRole: 'admin' }).save();
    res.status(201).json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/admin/ongoing-classes/:id
router.patch('/ongoing-classes/:id', verifyAdminToken, [
  optionalString('className', { max: 120 }),
  optionalString('subject', { max: 120 }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  enumField('status', ONGOING_CLASS_STATUS, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const data = {};
    ONGOING_CLASS_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    snapshotRefs(req, data);
    const cls = await OngoingClass.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!cls) return res.status(404).json({ message: 'Class not found.' });
    res.json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/admin/ongoing-classes/:id
router.delete('/ongoing-classes/:id', verifyAdminToken, async (req, res) => {
  try {
    await OngoingClass.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted.' });
  } catch (err) { res.sendServerError(err); }
});

// ── Reports ───────────────────────────────────────────────────────────────────
const ResultSheet       = require('../models/ResultSheet');
const CorrectionRequest = require('../models/CorrectionRequest');
const Admission         = require('../models/Admission');
const FeeChallan        = require('../models/FeeChallan');

// GET /api/portal/admin/reports/result-sheets
router.get('/reports/result-sheets', verifyAdminToken, async (req, res) => {
  try {
    const { department, semester, subject, examType, status, teacherName } = req.query;
    const f = {};
    if (department)  f.department  = { $regex: escapeRegex(department), $options: 'i' };
    if (semester)    f.semester    = semester;
    if (subject)     f.subject     = { $regex: escapeRegex(subject), $options: 'i' };
    if (examType)    f.examType    = examType;
    if (status)      f.status      = status;
    if (teacherName) f.teacherName = { $regex: escapeRegex(teacherName), $options: 'i' };
    const sheets = await ResultSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/admin/reports/corrections?status=&type=
router.get('/reports/corrections', verifyAdminToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    const f = {};
    if (status) f.status = status;
    if (type)   f.type   = type;
    const reqs = await CorrectionRequest.find(f).sort({ createdAt: -1 });
    res.json(reqs);
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/admin/reports/corrections/:id — approve or reject a
// student-profile correction request. Approving applies the requested field
// changes to the Student record atomically (in the same transaction as the
// request's own status update, so a mid-way failure can't leave the request
// marked approved without the Student record actually changing); result-sheet
// type requests are reviewed by HOD/exam staff instead (see hodPortal.js /
// examPortal.js) and are rejected here to keep the two review flows from
// overlapping. Rejecting requires a reviewerComment — it's the reason shown
// to the student in their portal.
router.patch('/reports/corrections/:id', verifyAdminToken, [
  enumField('status', ['approved', 'rejected']),
  optionalString('reviewerComment', { max: 1000 }),
  validate,
], async (req, res) => {
  const { status, reviewerComment } = req.body;
  if (status === 'rejected' && !String(reviewerComment || '').trim()) {
    return res.status(400).json({ message: 'A reason is required when rejecting a correction request.' });
  }

  const session = await mongoose.startSession();
  try {
    let cr;
    let notFound = false;
    let alreadyReviewed = false;
    let wrongType = false;

    await session.withTransaction(async () => {
      cr = await CorrectionRequest.findById(req.params.id).session(session);
      if (!cr) { notFound = true; return; }
      if (cr.type !== 'student-profile') { wrongType = true; return; }
      if (cr.status !== 'pending') { alreadyReviewed = true; return; }

      cr.status          = status;
      cr.reviewedBy      = req.user.id;
      cr.reviewerRole    = 'admin';
      cr.reviewerComment = reviewerComment || '';
      cr.reviewedAt      = new Date();
      await cr.save({ session });

      if (status === 'approved' && cr.student) {
        const fieldUpdate = {};
        (cr.requestedFieldChanges || []).forEach(({ field, newValue }) => { fieldUpdate[field] = newValue; });
        if (Object.keys(fieldUpdate).length) {
          await Student.findByIdAndUpdate(cr.student, { $set: fieldUpdate }, { runValidators: true, session });
        }
      }
    });

    if (notFound) return res.status(404).json({ message: 'Correction request not found.' });
    if (wrongType) return res.status(400).json({ message: 'Only student-profile correction requests are reviewed here.' });
    if (alreadyReviewed) return res.status(400).json({ message: 'This request has already been reviewed.' });

    await logAudit(req, {
      action: `correctionRequest.${status}`, entityType: 'CorrectionRequest', entityId: cr._id,
      entityLabel: cr.studentName || '', before: { status: 'pending' }, after: { status, reviewerComment: cr.reviewerComment },
    });

    res.json({ message: `Correction request ${status}.`, request: cr });
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// GET /api/portal/admin/reports/admissions
router.get('/reports/admissions', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, program, gender } = req.query;
    const f = {};
    if (status)     f.status     = status;
    if (department) f.department = { $regex: escapeRegex(department), $options: 'i' };
    if (program)    f.program    = { $regex: escapeRegex(program), $options: 'i' };
    if (gender)     f.gender     = gender;
    const admissions = await Admission.find(f).sort({ createdAt: -1 });
    res.json(admissions);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/admin/reports/challans
router.get('/reports/challans', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, program, semester } = req.query;
    const f = {};
    if (status)     f.status     = status;
    if (department) f.department = { $regex: escapeRegex(department), $options: 'i' };
    if (program)    f.program    = { $regex: escapeRegex(program), $options: 'i' };
    if (semester)   f.semester   = semester;
    const challans = await FeeChallan.find(f).sort({ issuedAt: -1 });
    res.json(challans);
  } catch (err) { res.sendServerError(err); }
});

// ── Academic Sessions ─────────────────────────────────────────────────────────
const AcademicSession = require('../models/AcademicSession');

router.get('/sessions', verifyAdminToken, async (req, res) => {
  try {
    const filter = req.query.includeArchived === 'true' ? {} : { status: { $ne: 'archived' } };
    const sessions = await AcademicSession.find(filter).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) { res.sendServerError(err); }
});

router.post('/sessions', verifyAdminToken, async (req, res) => {
  try {
    const session = await new AcademicSession(req.body).save();
    res.status(201).json(session);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/sessions/:id', verifyAdminToken, async (req, res) => {
  try {
    const session = await AcademicSession.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json(session);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/admin/sessions/:id/archive — replaces the old hard delete
router.patch('/sessions/:id/archive', verifyAdminToken, async (req, res) => {
  try {
    const before = await AcademicSession.findById(req.params.id);
    if (!before) return res.status(404).json({ message: 'Session not found.' });
    // isActive is the older toggle the public /api/lookups/sessions endpoint
    // filters on — keep it in sync with status so an archived session
    // disappears from registration dropdowns too.
    const session = await AcademicSession.findByIdAndUpdate(req.params.id, { status: 'archived', isActive: false }, { new: true });
    await logAudit(req, {
      action: 'academicSession.archive', entityType: 'AcademicSession', entityId: session._id, entityLabel: session.name,
      before: { status: before.status }, after: { status: 'archived' },
    });
    res.json({ message: 'Session archived.', session });
  } catch (err) { res.sendServerError(err); }
});

router.patch('/sessions/:id/restore', verifyAdminToken, async (req, res) => {
  try {
    const before = await AcademicSession.findById(req.params.id);
    if (!before) return res.status(404).json({ message: 'Session not found.' });
    const session = await AcademicSession.findByIdAndUpdate(req.params.id, { status: 'active', isActive: true }, { new: true });
    await logAudit(req, {
      action: 'academicSession.restore', entityType: 'AcademicSession', entityId: session._id, entityLabel: session.name,
      before: { status: before.status }, after: { status: 'active' },
    });
    res.json({ message: 'Session restored.', session });
  } catch (err) { res.sendServerError(err); }
});

// ── Semesters ─────────────────────────────────────────────────────────────────
const Semester = require('../models/Semester');

router.get('/semesters', verifyAdminToken, async (req, res) => {
  try {
    const { department, program, status, includeArchived } = req.query;
    const f = {};
    if (department) f.department = { $regex: escapeRegex(department), $options: 'i' };
    if (program)    f.program    = { $regex: escapeRegex(program), $options: 'i' };
    if (status)     f.status     = status;
    else if (includeArchived !== 'true') f.status = { $ne: 'archived' };
    const semesters = await Semester.find(f).sort({ number: 1, createdAt: -1 });
    res.json(semesters);
  } catch (err) { res.sendServerError(err); }
});

router.post('/semesters', verifyAdminToken, [
  resolveRef('programId', Program, 'program', { optional: true, activeFilter: refFilters.PROGRAM_ACTIVE }),
  resolveRef('departmentId', Department, 'department', { optional: true, activeFilter: refFilters.DEPARTMENT_ACTIVE }),
  validate,
], async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.resolvedRefs?.program) data.program = req.resolvedRefs.program.title;
    if (req.resolvedRefs?.department) data.department = req.resolvedRefs.department.name;
    const sem = await new Semester(data).save();
    res.status(201).json(sem);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/semesters/:id', verifyAdminToken, [
  resolveRef('programId', Program, 'program', { optional: true, activeFilter: refFilters.PROGRAM_ACTIVE }),
  resolveRef('departmentId', Department, 'department', { optional: true, activeFilter: refFilters.DEPARTMENT_ACTIVE }),
  validate,
], async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.resolvedRefs?.program) data.program = req.resolvedRefs.program.title;
    if (req.resolvedRefs?.department) data.department = req.resolvedRefs.department.name;
    const sem = await Semester.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!sem) return res.status(404).json({ message: 'Semester not found.' });
    res.json(sem);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/admin/semesters/:id/archive — replaces the old hard delete
router.patch('/semesters/:id/archive', verifyAdminToken, async (req, res) => {
  try {
    const before = await Semester.findById(req.params.id);
    if (!before) return res.status(404).json({ message: 'Semester not found.' });
    const sem = await Semester.findByIdAndUpdate(req.params.id, { status: 'archived', isActive: false }, { new: true });
    await logAudit(req, {
      action: 'semester.archive', entityType: 'Semester', entityId: sem._id, entityLabel: sem.name,
      before: { status: before.status }, after: { status: 'archived' },
    });
    res.json({ message: 'Semester archived.', semester: sem });
  } catch (err) { res.sendServerError(err); }
});

router.patch('/semesters/:id/restore', verifyAdminToken, async (req, res) => {
  try {
    const before = await Semester.findById(req.params.id);
    if (!before) return res.status(404).json({ message: 'Semester not found.' });
    const sem = await Semester.findByIdAndUpdate(req.params.id, { status: 'active', isActive: true }, { new: true });
    await logAudit(req, {
      action: 'semester.restore', entityType: 'Semester', entityId: sem._id, entityLabel: sem.name,
      before: { status: before.status }, after: { status: 'active' },
    });
    res.json({ message: 'Semester restored.', semester: sem });
  } catch (err) { res.sendServerError(err); }
});

// ── Designations ──────────────────────────────────────────────────────────────
const Designation = require('../models/Designation');

router.get('/designations', verifyAdminToken, async (req, res) => {
  try {
    const designations = await Designation.find().sort({ title: 1 });
    res.json(designations);
  } catch (err) { res.sendServerError(err); }
});

router.post('/designations', verifyAdminToken, [requiredString('title', { max: 120 }), validate], async (req, res) => {
  try {
    const designation = await new Designation({ title: req.body.title }).save();
    res.status(201).json(designation);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/designations/:id', verifyAdminToken, [
  optionalString('title', { max: 120 }),
  validate,
], async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
    const designation = await Designation.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!designation) return res.status(404).json({ message: 'Designation not found.' });
    res.json(designation);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

router.delete('/designations/:id', verifyAdminToken, async (req, res) => {
  try {
    await Designation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Designation deleted.' });
  } catch (err) { res.sendServerError(err); }
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
const AuditLog = require('../models/AuditLog');

// GET /api/portal/admin/audit-logs?entityType=&actorRole=&from=&to=&search=&page=&limit=
router.get('/audit-logs', verifyAdminToken, async (req, res) => {
  try {
    const { entityType, actorRole, from, to, search, page, limit } = req.query;
    const f = {};
    if (entityType) f.entityType = entityType;
    if (actorRole)  f.actorRole  = actorRole;
    if (from || to) {
      f.createdAt = {};
      if (from) f.createdAt.$gte = new Date(from);
      if (to)   f.createdAt.$lte = new Date(to);
    }
    if (search) {
      f.$or = [
        { action:      { $regex: escapeRegex(search), $options: 'i' } },
        { actorName:   { $regex: escapeRegex(search), $options: 'i' } },
        { entityLabel: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [logs, total] = await Promise.all([
      AuditLog.find(f).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      AuditLog.countDocuments(f),
    ]);

    res.json({ logs, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/admin/audit-logs/entity/:type/:id — full history for one record
router.get('/audit-logs/entity/:type/:id', verifyAdminToken, async (req, res) => {
  try {
    const logs = await AuditLog.find({ entityType: req.params.type, entityId: req.params.id }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
