const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const TeacherIdSlot = require('../models/TeacherIdSlot');
const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { verifyTeacherToken } = require('../middleware/auth');

const { createUpload } = require('../utils/cloudinary');
const upload = createUpload('portal/teacher');

const {
  cnic, phone, personName, email, password: passwordChain, teacherId: teacherIdChain,
  requiredString, optionalString, mongoId, enumField, dateOfBirth, validate, enums,
  departmentRef, programRef, sessionRef, designationRef, snapshotRefs,
} = require('../validators');
const { escapeRegex } = require('../utils/escapeRegex');
const { isDuplicateKeyError, duplicateKeyMessage } = require('../utils/duplicateKey');
const { authLimiter } = require('../middleware/rateLimiters');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');
const { logAudit } = require('../utils/audit');

const TEACHER_REGISTER_ALLOWED_FIELDS = ['fullName', 'email', 'phone', 'cnic', 'qualification'];

// POST /api/portal/teacher/register
router.post('/register', authLimiter, [
  teacherIdChain('teacherId'),
  personName('fullName'),
  email('email'),
  passwordChain('password'),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  departmentRef({ optional: true }),
  optionalString('qualification', { max: 200 }),
  designationRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const { teacherId, password, classesTaught } = req.body;

    // Atomically claim the slot — a plain findOne()+later save() would let two
    // concurrent registrations both pass the isUsed check before either write
    // lands. findOneAndUpdate with isUsed:false in the filter is a
    // compare-and-swap: only one concurrent request can flip it.
    const claimedSlot = await TeacherIdSlot.findOneAndUpdate(
      { teacherId, isUsed: false },
      { $set: { isUsed: true, usedBy: req.body.email } },
      { new: true }
    );
    if (!claimedSlot) {
      const exists = await TeacherIdSlot.exists({ teacherId });
      return res.status(400).json({
        message: exists ? 'This Teacher ID is already registered.' : 'Invalid Teacher ID. Please contact admin for a valid ID.',
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const classes = typeof classesTaught === 'string'
        ? classesTaught.split(',').map(c => c.trim()).filter(Boolean)
        : classesTaught || [];

      const data = {};
      TEACHER_REGISTER_ALLOWED_FIELDS.forEach((field) => {
        if (req.body[field] !== undefined) data[field] = req.body[field];
      });
      snapshotRefs(req, data);

      const teacher = new Teacher({
        teacherId, ...data, classesTaught: classes, password: hashedPassword, status: 'pending',
      });
      await teacher.save();
    } catch (err) {
      // Registration failed after the slot was claimed (e.g. duplicate
      // email/cnic) — release the slot so the teacher can retry.
      await TeacherIdSlot.updateOne({ _id: claimedSlot._id }, { $set: { isUsed: false, usedBy: '' } });
      throw err;
    }

    res.status(201).json({ message: 'Registration submitted. Pending admin approval.' });
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(400).json({ message: duplicateKeyMessage(error) });
    res.status(400).json({ message: error.message });
  }
});

// POST /api/portal/teacher/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const teacherId = String(req.body.teacherId || '').trim().toUpperCase();
    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) return res.status(401).json({ message: 'Invalid credentials.' });

    if (teacher.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact admin.' });

    if (isLocked(teacher)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(teacher)} minute(s).` });
    }

    const valid = await bcrypt.compare(password, teacher.password);
    if (!valid) {
      await recordFailedAttempt(teacher);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    await resetFailedAttempts(teacher);

    if (teacher.status === 'pending') return res.status(403).json({ message: 'Your account is pending admin approval.' });
    if (teacher.status === 'rejected') return res.status(403).json({ message: 'Your account has been rejected.' });

    const token = jwt.sign(
      { id: teacher._id, role: 'teacher', teacherId: teacher.teacherId, tokenVersion: teacher.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    const teacherData = teacher.toObject();
    delete teacherData.password;
    res.json({ token, teacher: teacherData });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/teacher/profile
router.get('/profile', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json(teacher);
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/teacher/ongoing-classes
router.patch('/ongoing-classes', verifyTeacherToken, async (req, res) => {
  try {
    const { ongoingClasses } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      { ongoingClasses },
      { new: true }
    ).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json({ message: 'Ongoing classes updated.', teacher });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/teacher/teaching-assignments
router.patch('/teaching-assignments', verifyTeacherToken, async (req, res) => {
  try {
    const { teachingAssignments } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(
      req.user.id,
      { teachingAssignments },
      { new: true }
    ).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json({ message: 'Teaching assignments updated.', teacher });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/teacher/teaching-fields
router.get('/teaching-fields', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('teachingFields');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json(teacher.teachingFields || []);
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/teacher/teaching-fields — add one field
router.post('/teaching-fields', verifyTeacherToken, async (req, res) => {
  try {
    const { subject, program, description } = req.body;
    if (!subject?.trim()) return res.status(400).json({ message: 'Subject name is required.' });
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    // department is always the teacher's own — never trust a client-supplied
    // override, which would otherwise let a teacher tag a field with any
    // department they like.
    teacher.teachingFields.push({ subject: subject.trim(), program, department: teacher.department, description });
    await teacher.save();
    res.status(201).json({ message: 'Teaching field added.', teachingFields: teacher.teachingFields });
  } catch (err) { res.sendServerError(err); }
});

// DELETE /api/portal/teacher/teaching-fields/:fieldId — remove one field
router.delete('/teaching-fields/:fieldId', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    const before = teacher.teachingFields.length;
    teacher.teachingFields = teacher.teachingFields.filter(f => f._id.toString() !== req.params.fieldId);
    if (teacher.teachingFields.length === before) return res.status(404).json({ message: 'Field not found.' });
    await teacher.save();
    res.json({ message: 'Teaching field removed.', teachingFields: teacher.teachingFields });
  } catch (err) { res.sendServerError(err); }
});

// ── Attendance ──────────────────────────────────────────────────────────────
const Attendance    = require('../models/Attendance');
const OngoingClass  = require('../models/OngoingClass');

// GET /api/portal/teacher/attendance?ongoingClassId=X
router.get('/attendance', verifyTeacherToken, async (req, res) => {
  try {
    const f = { teacher: req.user.id };
    if (req.query.ongoingClassId) f.ongoingClassId = req.query.ongoingClassId;
    const sessions = await Attendance.find(f).sort({ date: -1 });
    res.json(sessions);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/teacher/attendance/report?ongoingClassId=X
router.get('/attendance/report', verifyTeacherToken, async (req, res) => {
  try {
    const { ongoingClassId } = req.query;
    if (!ongoingClassId) return res.status(400).json({ message: 'ongoingClassId is required.' });
    const sessions = await Attendance.find({ teacher: req.user.id, ongoingClassId }).sort({ date: 1 });
    // Aggregate per student
    const map = {};
    sessions.forEach(s => {
      s.records.forEach(r => {
        if (!map[r.registrationNo]) map[r.registrationNo] = { registrationNo: r.registrationNo, studentName: r.studentName, Present: 0, Absent: 0, Late: 0, Excused: 0, total: 0 };
        map[r.registrationNo][r.status]++;
        map[r.registrationNo].total++;
      });
    });
    const report = Object.values(map).map(s => ({
      ...s,
      attendancePercent: s.total ? Math.round(((s.Present + s.Late) / s.total) * 100) : 0,
    }));
    res.json({ sessions: sessions.length, report });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/teacher/attendance/:id
router.get('/attendance/:id', verifyTeacherToken, async (req, res) => {
  try {
    const session = await Attendance.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json(session);
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/teacher/attendance
router.post('/attendance', verifyTeacherToken, async (req, res) => {
  try {
    const { ongoingClassId, date, records } = req.body;
    if (!ongoingClassId || !date) return res.status(400).json({ message: 'ongoingClassId and date are required.' });

    // Normalize to midnight UTC so two requests for the same calendar day
    // always collide on the unique (ongoingClassId, date) index, regardless
    // of what time-of-day component the client happened to send.
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'date must be a valid date.' });
    parsedDate.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (parsedDate.getTime() > today.getTime()) {
      return res.status(400).json({ message: 'Attendance cannot be recorded for a future date.' });
    }

    const cls = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
    if (!cls) return res.status(403).json({ message: 'Class not found or not assigned to you.' });
    const session = new Attendance({
      teacher: req.user.id,
      ongoingClassId,
      subject: cls.subject,
      className: cls.className,
      department: cls.department,
      program: cls.program,
      semester: cls.semester,
      date: parsedDate,
      records: records || [],
    });
    await session.save();
    await logAudit(req, {
      action: 'attendance.create', entityType: 'Attendance', entityId: session._id,
      entityLabel: `${session.className || session.subject} — ${session.date.toDateString()}`,
      after: { records: session.records.length },
    });
    res.status(201).json(session);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Attendance already recorded for this class on that date.' });
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/portal/teacher/attendance/:id
router.patch('/attendance/:id', verifyTeacherToken, async (req, res) => {
  try {
    const session = await Attendance.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    const before = { records: session.records.length, date: session.date };
    if (req.body.records) session.records = req.body.records;
    if (req.body.date) {
      const parsedDate = new Date(req.body.date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'date must be a valid date.' });
      parsedDate.setUTCHours(0, 0, 0, 0);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (parsedDate.getTime() > today.getTime()) {
        return res.status(400).json({ message: 'Attendance cannot be recorded for a future date.' });
      }
      session.date = parsedDate;
    }
    await session.save();
    await logAudit(req, {
      action: 'attendance.update', entityType: 'Attendance', entityId: session._id,
      entityLabel: `${session.className || session.subject} — ${session.date.toDateString()}`,
      before, after: { records: session.records.length, date: session.date },
    });
    res.json(session);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Attendance already recorded for this class on that date.' });
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/portal/teacher/attendance/:id
router.delete('/attendance/:id', verifyTeacherToken, async (req, res) => {
  try {
    const session = await Attendance.findOneAndDelete({ _id: req.params.id, teacher: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json({ message: 'Attendance session deleted.' });
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/teacher/results
router.post('/results', verifyTeacherToken, upload.single('file'), [
  requiredString('title', { max: 200 }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession, passingMarks, results } = req.body;
    const result = new Result(snapshotRefs(req, {
      title, examType, semester, department, program, session, timeSession: timeSession || undefined,
      passingMarks: passingMarks ? Number(passingMarks) : undefined,
      uploadedBy: req.user.id,
      uploadedByRole: 'teacher',
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

// GET /api/portal/teacher/results
router.get('/results', verifyTeacherToken, async (req, res) => {
  try {
    const results = await Result.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/teacher/results/:id
router.patch('/results/:id', verifyTeacherToken, upload.single('file'), [
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  validate,
], async (req, res) => {
  try {
    const result = await Result.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!result) return res.status(404).json({ message: 'Result not found or access denied.' });

    const { title, examType, semester, department, program, session, timeSession, passingMarks, results } = req.body;
    if (title) result.title = title;
    if (examType) result.examType = examType;
    if (semester !== undefined) result.semester = semester;
    if (department !== undefined && !req.resolvedRefs?.department) result.department = department;
    if (program   !== undefined && !req.resolvedRefs?.program)     result.program    = program;
    if (session   !== undefined && !req.resolvedRefs?.session)     result.session    = session;
    snapshotRefs(req, result);
    if (timeSession !== undefined) result.timeSession = timeSession || undefined;
    if (passingMarks !== undefined) result.passingMarks = passingMarks === '' ? undefined : Number(passingMarks);
    if (results !== undefined) result.results = JSON.parse(results);
    if (req.file) {
      result.fileUrl = req.file.path;
      result.fileName = req.file.originalname;
    }

    await result.save();
    res.json({ message: 'Result updated successfully.', result });
  } catch (error) {
    res.sendServerError(error);
  }
});

// DELETE /api/portal/teacher/results/:id
router.delete('/results/:id', verifyTeacherToken, async (req, res) => {
  try {
    const result = await Result.findOneAndDelete({ _id: req.params.id, uploadedBy: req.user.id });
    if (!result) return res.status(404).json({ message: 'Result not found or access denied.' });
    res.json({ message: 'Result deleted successfully.' });
  } catch (error) {
    res.sendServerError(error);
  }
});

// POST /api/portal/teacher/assignments
router.post('/assignments', verifyTeacherToken, upload.single('file'), async (req, res) => {
  try {
    const { title, description, ongoingClassId, dueDate, totalMarks } = req.body;
    if (!ongoingClassId) return res.status(400).json({ message: 'Please select a class for this assignment.' });

    const cls = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
    if (!cls) return res.status(404).json({ message: 'Class not found or not assigned to you.' });

    const assignment = new Assignment({
      title, description,
      ongoingClassId: cls._id,
      subject:        cls.subject        || '',
      className:      cls.className      || '',
      department:     cls.department     || '',
      departmentId:   cls.departmentId,
      program:        cls.program        || '',
      programId:      cls.programId,
      semester:       cls.semester       || '',
      academicSession:cls.academicSession|| '',
      sessionId:      cls.sessionId,
      dueDate:        dueDate || undefined,
      totalMarks:     totalMarks ? Number(totalMarks) : 100,
      uploadedBy:     req.user.id,
      uploadedByRole: 'teacher',
      fileUrl:  req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
    });
    await assignment.save();
    res.status(201).json({ message: 'Assignment posted successfully.', assignment });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/teacher/assignments
router.get('/assignments', verifyTeacherToken, async (req, res) => {
  try {
    const assignments = await Assignment.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/teacher/assignments/:id
router.patch('/assignments/:id', verifyTeacherToken, upload.single('file'), async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found or access denied.' });
    const { title, description, ongoingClassId, dueDate, totalMarks } = req.body;
    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate || undefined;
    if (totalMarks !== undefined) assignment.totalMarks = Number(totalMarks);
    if (ongoingClassId && ongoingClassId !== String(assignment.ongoingClassId)) {
      const cls = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
      if (!cls) return res.status(404).json({ message: 'Class not found or not assigned to you.' });
      assignment.ongoingClassId  = cls._id;
      assignment.subject         = cls.subject         || '';
      assignment.className       = cls.className       || '';
      assignment.department      = cls.department      || '';
      assignment.departmentId    = cls.departmentId;
      assignment.program         = cls.program         || '';
      assignment.programId       = cls.programId;
      assignment.semester        = cls.semester        || '';
      assignment.academicSession = cls.academicSession || '';
      assignment.sessionId       = cls.sessionId;
    }
    if (req.file) {
      assignment.fileUrl = req.file.path;
      assignment.fileName = req.file.originalname;
    }
    await assignment.save();
    res.json({ message: 'Assignment updated successfully.', assignment });
  } catch (error) {
    res.sendServerError(error);
  }
});

// DELETE /api/portal/teacher/assignments/:id
router.delete('/assignments/:id', verifyTeacherToken, async (req, res) => {
  try {
    const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, uploadedBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found or access denied.' });
    await AssignmentSubmission.deleteMany({ assignmentId: req.params.id });
    res.json({ message: 'Assignment deleted successfully.' });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/teacher/assignments/:id/submissions
router.get('/assignments/:id/submissions', verifyTeacherToken, async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found or access denied.' });
    const submissions = await AssignmentSubmission.find({ assignmentId: req.params.id }).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.sendServerError(error);
  }
});

// PATCH /api/portal/teacher/assignments/:id/submissions/:subId  — grade a submission
router.patch('/assignments/:id/submissions/:subId', verifyTeacherToken, async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found or access denied.' });
    const { obtainedMarks, feedback } = req.body;
    const update = { gradedAt: new Date() };
    if (obtainedMarks !== undefined && obtainedMarks !== '') update.obtainedMarks = Number(obtainedMarks);
    if (feedback !== undefined) update.feedback = feedback;
    // Scope by assignmentId too — without this, a valid :id (any assignment
    // this teacher owns) paired with an arbitrary :subId let a teacher grade
    // a submission belonging to a completely different assignment/teacher.
    const sub = await AssignmentSubmission.findOneAndUpdate(
      { _id: req.params.subId, assignmentId: req.params.id }, update, { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });
    res.json(sub);
  } catch (err) { res.sendServerError(err); }
});

// ─── Result Sheets & Correction Requests ─────────────────────────────────────
const ResultSheet       = require('../models/ResultSheet');
const CorrectionRequest = require('../models/CorrectionRequest');

function autoGrade(percentage) {
  const p = Number(percentage) || 0;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
}

function calcGpa(percentage) {
  const p = Math.min(100, Math.max(0, Number(percentage) || 0));
  return Math.round((p / 100) * 4 * 100) / 100;
}

// Validates each entry's marks against [0, totalMarks] — out-of-range marks
// are REJECTED (not silently clamped), so a typo can't quietly change a
// student's real score. Returns { processed, errors }; processed is only
// meaningful when errors is empty.
function validateAndProcessEntries(entries, totalMarks) {
  const errors = [];
  const processed = (entries || []).map((e, idx) => {
    const label = e.registrationNo || `row ${idx + 1}`;
    const marks = Number(e.obtainedMarks);
    if (e.obtainedMarks === '' || e.obtainedMarks === undefined || e.obtainedMarks === null || Number.isNaN(marks)) {
      errors.push(`${label}: marks are required.`);
    } else if (marks < 0 || marks > totalMarks) {
      errors.push(`${label}: marks must be between 0 and ${totalMarks}.`);
    }
    const safeMarks = Number.isNaN(marks) ? 0 : Math.min(totalMarks, Math.max(0, marks));
    const pct = totalMarks > 0 ? (safeMarks / totalMarks) * 100 : 0;
    return {
      registrationNo: String(e.registrationNo || '').trim().toUpperCase(),
      studentName:    e.studentName    || '',
      fatherName:     e.fatherName     || '',
      obtainedMarks:  safeMarks,
      gpa:            calcGpa(pct),
      grade:          autoGrade(pct),
      remarks:        e.remarks || '',
      resultStatus:   'Pending',
    };
  });
  return { processed, errors };
}

// Every entry must name a real, currently-approved student enrolled in the
// same department/program/semester the result sheet belongs to — otherwise
// a teacher could submit grades for a made-up or unrelated registration
// number. `scope` is either an OngoingClass or a ResultSheet document; both
// carry the same department/departmentId/program/programId/semester fields.
async function findUnknownStudents(processedEntries, scope) {
  const regNos = [...new Set(processedEntries.map(e => e.registrationNo).filter(Boolean))];
  if (!regNos.length) return [];

  const semMatch = String(scope.semester || '').match(/\d+/);
  const semesterNumber = semMatch ? Number(semMatch[0]) : null;

  const filter = { registrationNo: { $in: regNos }, status: 'approved' };
  if (scope.departmentId) filter.departmentId = scope.departmentId;
  else if (scope.department) filter.department = scope.department;
  if (scope.programId) filter.programId = scope.programId;
  else if (scope.program) filter.program = scope.program;
  if (semesterNumber != null) filter.currentSemester = semesterNumber;

  const found = await Student.find(filter).select('registrationNo');
  const foundSet = new Set(found.map(s => s.registrationNo));
  return regNos.filter(r => !foundSet.has(r));
}

// GET /api/portal/teacher/result-sheets
router.get('/result-sheets', verifyTeacherToken, async (req, res) => {
  try {
    const sheets = await ResultSheet.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/teacher/result-sheets
router.post('/result-sheets', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('fullName teacherId');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

    const { ongoingClassId, examType, entries } = req.body;
    if (!ongoingClassId) return res.status(400).json({ message: 'Please select a class.' });

    const oc = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
    if (!oc) return res.status(403).json({ message: 'Class not found or not assigned to you.' });

    const totalMarks = 100;
    const { processed, errors: marksErrors } = validateAndProcessEntries(entries, totalMarks);
    if (marksErrors.length) {
      return res.status(400).json({ message: 'Some entries have invalid marks.', errors: marksErrors });
    }
    const unknown = await findUnknownStudents(processed, oc);
    if (unknown.length) {
      return res.status(400).json({
        message: `These registration numbers are not approved students in ${oc.department || 'this department'} / ${oc.program || 'this program'} / ${oc.semester || 'this semester'}: ${unknown.join(', ')}`,
      });
    }

    const sheet = new ResultSheet({
      teacher: req.user.id,
      teacherId: teacher.teacherId,
      teacherName: teacher.fullName,
      ongoingClassId: oc._id,
      subject: oc.subject,
      department: oc.department,
      departmentId: oc.departmentId,
      program: oc.program || '',
      programId: oc.programId,
      semester: oc.semester || '',
      academicSession: oc.academicSession || '',
      sessionId: oc.sessionId,
      examType: examType || 'Final',
      totalMarks,
      entries: processed,
      status: 'draft',
    });
    await sheet.save();
    res.status(201).json({ message: 'Result sheet saved as draft.', sheet });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/teacher/result-sheets/:id
router.get('/result-sheets/:id', verifyTeacherToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    res.json(sheet);
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/teacher/result-sheets/:id  (draft only)
router.patch('/result-sheets/:id', verifyTeacherToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    if (sheet.status !== 'draft') return res.status(403).json({ message: 'Only draft result sheets can be edited.' });

    const { examType, entries } = req.body;
    if (examType !== undefined) sheet.examType = examType;
    if (entries !== undefined) {
      const { processed, errors: marksErrors } = validateAndProcessEntries(entries, sheet.totalMarks || 100);
      if (marksErrors.length) {
        return res.status(400).json({ message: 'Some entries have invalid marks.', errors: marksErrors });
      }
      const unknown = await findUnknownStudents(processed, sheet);
      if (unknown.length) {
        return res.status(400).json({
          message: `These registration numbers are not approved students in ${sheet.department || 'this department'} / ${sheet.program || 'this program'} / ${sheet.semester || 'this semester'}: ${unknown.join(', ')}`,
        });
      }
      sheet.entries = processed;
    }

    await sheet.save();
    res.json({ message: 'Result sheet updated.', sheet });
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/teacher/result-sheets/:id/submit
router.patch('/result-sheets/:id/submit', verifyTeacherToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    if (sheet.status !== 'draft') return res.status(403).json({ message: 'Only draft result sheets can be submitted.' });
    if (!sheet.entries.length) return res.status(400).json({ message: 'Cannot submit an empty result sheet.' });

    sheet.status = 'submitted';
    sheet.submittedAt = new Date();
    sheet.returnedRemarks = '';
    sheet.returnedAt = undefined;
    await sheet.save();
    await logAudit(req, {
      action: 'resultSheet.submit', entityType: 'ResultSheet', entityId: sheet._id,
      entityLabel: `${sheet.subject} — ${sheet.department}`,
      before: { status: 'draft' }, after: { status: 'submitted', entries: sheet.entries.length },
    });
    res.json({ message: 'Result sheet submitted successfully.', sheet });
  } catch (err) { res.sendServerError(err); }
});

// POST /api/portal/teacher/result-sheets/:id/correction-request
router.post('/result-sheets/:id/correction-request', verifyTeacherToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    if (sheet.status === 'draft') return res.status(400).json({ message: 'Submit the result sheet before requesting corrections.' });

    const alreadyPending = await CorrectionRequest.findOne({ resultSheet: req.params.id, status: 'pending' });
    if (alreadyPending) return res.status(400).json({ message: 'A correction request is already pending for this result sheet.' });

    const teacher = await Teacher.findById(req.user.id).select('fullName teacherId');
    const { reason, requestedChanges } = req.body;
    if (!reason || !requestedChanges) return res.status(400).json({ message: 'Reason and requested changes are required.' });

    const cr = new CorrectionRequest({
      resultSheet: sheet._id,
      teacher: req.user.id,
      teacherId: teacher.teacherId,
      teacherName: teacher.fullName,
      subject: sheet.subject,
      department: sheet.department,
      semester: sheet.semester,
      examType: sheet.examType,
      reason,
      requestedChanges,
    });
    await cr.save();
    res.status(201).json({ message: 'Correction request submitted successfully.', request: cr });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/teacher/correction-requests
router.get('/correction-requests', verifyTeacherToken, async (req, res) => {
  try {
    const requests = await CorrectionRequest.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.sendServerError(err); }
});

// ── Ongoing Classes (teacher's own) ──────────────────

// GET /api/portal/teacher/ongoing-classes
router.get('/ongoing-classes', verifyTeacherToken, async (req, res) => {
  try {
    const classes = await OngoingClass.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.sendServerError(err); }
});

const ONGOING_CLASS_FIELDS = [
  'className', 'subject', 'semester', 'timeSession',
  'days', 'startTime', 'endTime', 'room', 'location', 'weeklyHours', 'maxStudents', 'status',
];

// POST /api/portal/teacher/ongoing-classes
router.post('/ongoing-classes', verifyTeacherToken, [
  requiredString('className', { max: 120 }),
  requiredString('subject', { max: 120 }),
  departmentRef({ optional: false }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const teacher = await require('../models/Teacher').findById(req.user.id).select('fullName teacherId');
    const data = {};
    ONGOING_CLASS_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    snapshotRefs(req, data);
    const cls = await new OngoingClass({
      ...data,
      teacher:      req.user.id,
      teacherName:  teacher?.fullName,
      teacherId:    teacher?.teacherId,
      createdBy:    req.user.id,
      createdByRole:'teacher',
    }).save();
    res.status(201).json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/teacher/ongoing-classes/:id
router.patch('/ongoing-classes/:id', verifyTeacherToken, [
  optionalString('className', { max: 120 }),
  optionalString('subject', { max: 120 }),
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const data = {};
    ONGOING_CLASS_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    snapshotRefs(req, data);
    const cls = await OngoingClass.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      data, { new: true, runValidators: true }
    );
    if (!cls) return res.status(404).json({ message: 'Class not found or access denied.' });
    res.json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/teacher/ongoing-classes/:id
router.delete('/ongoing-classes/:id', verifyTeacherToken, async (req, res) => {
  try {
    const cls = await OngoingClass.findOneAndDelete({ _id: req.params.id, teacher: req.user.id });
    if (!cls) return res.status(404).json({ message: 'Class not found or access denied.' });
    res.json({ message: 'Class deleted.' });
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
