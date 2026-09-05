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

const multer = require('multer');
const ExcelJS = require('exceljs');
// Result-sheet Excel import: parsed in memory and discarded — never written
// to disk/cloud, unlike the attachment uploads above.
const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// NOTE: teachers can no longer self-assign which classes/subjects they teach —
// that authority moved to the HOD (see POST/PATCH/DELETE /portal/hod/ongoing-classes
// in hodPortal.js). The old self-service PATCH /ongoing-classes (which overwrote the
// unused Teacher.ongoingClasses embedded array) and PATCH /teaching-assignments
// (self-declared department/session workload) routes were removed for the same reason.

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
const { summarizeSessions } = require('../utils/attendanceSummary');
const { dispatchAbsenceAlerts } = require('../utils/attendanceAlerts');

// Shared by POST and PATCH /attendance — isMakeup requires both a missed-class
// date (in the past, at most 60 days ago) and a reason; a regular
// (non-make-up) session skips all of this. `today` must already be
// UTC-midnight-normalized by the caller.
function validateMakeupFields(isMakeup, makeupFor, makeupReason, today) {
  if (!isMakeup) return {};
  if (!makeupFor) return { error: 'makeupFor is required when isMakeup is true.' };
  if (!makeupReason || !String(makeupReason).trim()) return { error: 'makeupReason is required when isMakeup is true.' };
  const parsed = new Date(makeupFor);
  if (isNaN(parsed.getTime())) return { error: 'makeupFor must be a valid date.' };
  parsed.setUTCHours(0, 0, 0, 0);
  if (parsed.getTime() > today.getTime()) return { error: 'makeupFor must be a date in the past.' };
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);
  if (parsed.getTime() < sixtyDaysAgo.getTime()) return { error: 'makeupFor cannot be more than 60 days ago.' };
  return { parsedMakeupFor: parsed };
}

// Duplicate-key error on the { ongoingClassId, date, isMakeup } index — the
// message differentiates a regular-vs-regular collision from a
// make-up-vs-make-up one so it stays accurate now that both can share a date.
function duplicateAttendanceMessage(isMakeup) {
  return isMakeup
    ? 'A make-up class is already recorded for this class on that date.'
    : 'Attendance already recorded for this class on that date.';
}

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
    const report = summarizeSessions(sessions);
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
  let isMakeup = false;
  try {
    const { ongoingClassId, date, records, timetableSlot, kind, makeupFor, makeupReason } = req.body;
    isMakeup = !!req.body.isMakeup;
    if (!ongoingClassId || !date) return res.status(400).json({ message: 'ongoingClassId and date are required.' });

    // Normalize to midnight UTC so two requests for the same calendar day
    // always collide on the unique (ongoingClassId, date, isMakeup) index,
    // regardless of what time-of-day component the client happened to send.
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'date must be a valid date.' });
    parsedDate.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (parsedDate.getTime() > today.getTime()) {
      return res.status(400).json({ message: 'Attendance cannot be recorded for a future date.' });
    }

    const { error, parsedMakeupFor } = validateMakeupFields(isMakeup, makeupFor, makeupReason, today);
    if (error) return res.status(400).json({ message: error });

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
      timetableSlot: timetableSlot || undefined,
      isMakeup,
      makeupFor: isMakeup ? parsedMakeupFor : undefined,
      makeupReason: isMakeup ? String(makeupReason).trim() : '',
      kind: kind || 'theory',
    });
    await session.save();

    // Absence alerts must never fail an already-saved attendance sheet —
    // dispatchAbsenceAlerts() catches its own errors and returns 0 on failure.
    const notified = await dispatchAbsenceAlerts({ session, ongoingClass: cls });

    await logAudit(req, {
      action: 'attendance.create', entityType: 'Attendance', entityId: session._id,
      entityLabel: `${session.className || session.subject} — ${session.date.toDateString()}`,
      after: { records: session.records.length, isMakeup: session.isMakeup, makeupFor: session.makeupFor || null },
    });
    res.status(201).json({ ...session.toObject(), notified });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: duplicateAttendanceMessage(isMakeup) });
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/portal/teacher/attendance/:id
router.patch('/attendance/:id', verifyTeacherToken, async (req, res) => {
  let isMakeup = false;
  try {
    const session = await Attendance.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    const before = { records: session.records.length, date: session.date, isMakeup: session.isMakeup };

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    isMakeup = req.body.isMakeup !== undefined ? !!req.body.isMakeup : session.isMakeup;
    const effectiveMakeupFor = req.body.makeupFor !== undefined ? req.body.makeupFor : session.makeupFor;
    const effectiveMakeupReason = req.body.makeupReason !== undefined ? req.body.makeupReason : session.makeupReason;
    const { error, parsedMakeupFor } = validateMakeupFields(isMakeup, effectiveMakeupFor, effectiveMakeupReason, today);
    if (error) return res.status(400).json({ message: error });

    if (req.body.records) session.records = req.body.records;
    if (req.body.date) {
      const parsedDate = new Date(req.body.date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'date must be a valid date.' });
      parsedDate.setUTCHours(0, 0, 0, 0);
      if (parsedDate.getTime() > today.getTime()) {
        return res.status(400).json({ message: 'Attendance cannot be recorded for a future date.' });
      }
      session.date = parsedDate;
    }
    if (req.body.isMakeup !== undefined) session.isMakeup = isMakeup;
    if (isMakeup) {
      session.makeupFor = parsedMakeupFor;
      session.makeupReason = String(effectiveMakeupReason).trim();
    } else if (req.body.isMakeup !== undefined) {
      // isMakeup explicitly turned off — clear the make-up-only fields.
      session.makeupFor = undefined;
      session.makeupReason = '';
    }
    if (req.body.kind !== undefined) session.kind = req.body.kind;
    if (req.body.timetableSlot !== undefined) session.timetableSlot = req.body.timetableSlot || undefined;

    await session.save();

    const cls = await OngoingClass.findById(session.ongoingClassId);
    const notified = await dispatchAbsenceAlerts({ session, ongoingClass: cls });

    await logAudit(req, {
      action: 'attendance.update', entityType: 'Attendance', entityId: session._id,
      entityLabel: `${session.className || session.subject} — ${session.date.toDateString()}`,
      before, after: { records: session.records.length, date: session.date, isMakeup: session.isMakeup, makeupFor: session.makeupFor || null },
    });
    res.json({ ...session.toObject(), notified });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: duplicateAttendanceMessage(isMakeup) });
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

// Grade/GPA come from the single HEC-scale source of truth in utils/grading.js
// (also used by the student transcript in utils/academicSummary.js) — this
// used to be a separate, simpler 7-step scale defined right here, which would
// have produced a different grade than the transcript for the same
// percentage. Wrapped to keep the two call sites below unchanged.
const { gradeForPercentage } = require('../utils/grading');
function autoGrade(percentage) { return gradeForPercentage(percentage).grade; }
function calcGpa(percentage) { return gradeForPercentage(percentage).gradePoints; }

// Validates each entry's marks against [0, totalMarks] — out-of-range marks
// are REJECTED (not silently clamped), so a typo can't quietly change a
// student's real score. Returns { processed, errors }; processed is only
// meaningful when errors is empty.
//
// `markComponents`, when provided ({ sessionalMax, labMax|null, midMax, finalMax }),
// switches this into breakdown mode: each entry supplies sessionalMarks/labMarks/
// midMarks/finalMarks instead of a single obtainedMarks, each validated against its
// own max, and obtainedMarks is computed as their sum. Omitting markComponents keeps
// the original single-total behavior byte-for-byte, so every existing caller and
// every already-saved result sheet keeps working exactly as before.
// Lab subjects break marks into Sessional+Lab+Mid+Final; non-lab subjects
// break the "sessional" portion further into Quiz+Presentation+Assignment
// instead of a single Sessional figure — these are the two supported shapes.
function componentFieldsFor(markComponents, hasLab) {
  if (!markComponents) return null;
  return hasLab
    ? [
        ['sessionalMarks', markComponents.sessionalMax],
        ['labMarks', markComponents.labMax],
        ['midMarks', markComponents.midMax],
        ['finalMarks', markComponents.finalMax],
      ]
    : [
        ['quizMarks', markComponents.quizMax],
        ['presentationMarks', markComponents.presentationMax],
        ['assignmentMarks', markComponents.assignmentMax],
        ['midMarks', markComponents.midMax],
        ['finalMarks', markComponents.finalMax],
      ];
}

function validateAndProcessEntries(entries, totalMarks, markComponents, hasLab) {
  const errors = [];
  const componentFields = componentFieldsFor(markComponents, hasLab);

  const processed = (entries || []).map((e, idx) => {
    const label = e.registrationNo || `row ${idx + 1}`;
    let safeMarks;
    let sessionalMarks = null, labMarks = null, quizMarks = null, presentationMarks = null, assignmentMarks = null, midMarks = null, finalMarks = null;

    if (componentFields) {
      let sum = 0;
      let rowHasError = false;
      for (const [field, max] of componentFields) {
        const raw = e[field];
        const val = Number(raw);
        if (raw === '' || raw === undefined || raw === null || Number.isNaN(val)) {
          errors.push(`${label}: ${field} is required.`);
          rowHasError = true;
          continue;
        }
        if (val < 0 || val > max) {
          errors.push(`${label}: ${field} must be between 0 and ${max}.`);
          rowHasError = true;
          continue;
        }
        sum += val;
        if (field === 'sessionalMarks') sessionalMarks = val;
        if (field === 'labMarks') labMarks = val;
        if (field === 'quizMarks') quizMarks = val;
        if (field === 'presentationMarks') presentationMarks = val;
        if (field === 'assignmentMarks') assignmentMarks = val;
        if (field === 'midMarks') midMarks = val;
        if (field === 'finalMarks') finalMarks = val;
      }
      safeMarks = rowHasError ? 0 : Math.min(totalMarks, Math.max(0, sum));
    } else {
      const marks = Number(e.obtainedMarks);
      if (e.obtainedMarks === '' || e.obtainedMarks === undefined || e.obtainedMarks === null || Number.isNaN(marks)) {
        errors.push(`${label}: marks are required.`);
      } else if (marks < 0 || marks > totalMarks) {
        errors.push(`${label}: marks must be between 0 and ${totalMarks}.`);
      }
      safeMarks = Number.isNaN(marks) ? 0 : Math.min(totalMarks, Math.max(0, marks));
    }

    const pct = totalMarks > 0 ? (safeMarks / totalMarks) * 100 : 0;
    return {
      registrationNo: String(e.registrationNo || '').trim().toUpperCase(),
      studentName:    e.studentName    || '',
      fatherName:     e.fatherName     || '',
      sessionalMarks, labMarks, quizMarks, presentationMarks, assignmentMarks, midMarks, finalMarks,
      obtainedMarks:  safeMarks,
      gpa:            calcGpa(pct),
      grade:          autoGrade(pct),
      remarks:        e.remarks || '',
      resultStatus:   'Pending',
    };
  });
  return { processed, errors };
}

// markComponents must sum to totalMarks, or the breakdown wouldn't correspond
// to the sheet's own /100 scale. Returns an error string, or null if valid.
function validateMarkComponents(markComponents, totalMarks, hasLab) {
  if (!markComponents) return null;
  const parts = (hasLab
    ? [markComponents.sessionalMax, markComponents.labMax, markComponents.midMax, markComponents.finalMax]
    : [markComponents.quizMax, markComponents.presentationMax, markComponents.assignmentMax, markComponents.midMax, markComponents.finalMax]
  ).filter((v) => v != null);
  if (!parts.every((v) => Number.isFinite(v) && v >= 0)) {
    return 'Mark component maximums must be non-negative numbers.';
  }
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== totalMarks) {
    return `Mark components must add up to ${totalMarks} (currently ${sum}).`;
  }
  return null;
}

// The default component weighting for the two standard mark-sheet layouts —
// matches the university's existing lab / non-lab paper templates.
function defaultMarkComponents(hasLab) {
  return hasLab
    ? { sessionalMax: 15, labMax: 25, midMax: 20, finalMax: 40 }
    : { quizMax: 10, presentationMax: 5, assignmentMax: 5, midMax: 30, finalMax: 50 };
}

// Reads sessionalMax/labMax/midMax/finalMax overrides out of a query string or
// form body (both arrive as strings), falling back to the standard defaults.
function parseMarkComponentsFromQuery(src, hasLab) {
  const d = defaultMarkComponents(hasLab);
  const num = (v, fallback) => (v !== undefined && v !== '' && !Number.isNaN(Number(v))) ? Number(v) : fallback;
  return hasLab
    ? {
        sessionalMax: num(src.sessionalMax, d.sessionalMax),
        labMax: num(src.labMax, d.labMax),
        midMax: num(src.midMax, d.midMax),
        finalMax: num(src.finalMax, d.finalMax),
      }
    : {
        quizMax: num(src.quizMax, d.quizMax),
        presentationMax: num(src.presentationMax, d.presentationMax),
        assignmentMax: num(src.assignmentMax, d.assignmentMax),
        midMax: num(src.midMax, d.midMax),
        finalMax: num(src.finalMax, d.finalMax),
      };
}

// Approved students in the same department/program/semester as `scope` (an
// OngoingClass) — the real class roster, same matching rules as
// findUnknownStudents below so a downloaded template always agrees with
// what an uploaded/typed sheet will be validated against.
async function fetchApprovedRoster(scope) {
  const semMatch = String(scope.semester || '').match(/\d+/);
  const semesterNumber = semMatch ? Number(semMatch[0]) : null;
  const filter = { status: 'approved' };
  if (scope.departmentId) filter.departmentId = scope.departmentId;
  else if (scope.department) filter.department = scope.department;
  if (scope.programId) filter.programId = scope.programId;
  else if (scope.program) filter.program = scope.program;
  if (semesterNumber != null) filter.currentSemester = semesterNumber;
  return Student.find(filter).select('registrationNo fullName fatherName').sort('registrationNo');
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

    const { ongoingClassId, examType, entries, hasLab, markComponents } = req.body;
    if (!ongoingClassId) return res.status(400).json({ message: 'Please select a class.' });

    const oc = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
    if (!oc) return res.status(403).json({ message: 'Class not found or not assigned to you.' });

    const totalMarks = 100;
    const componentsErr = validateMarkComponents(markComponents, totalMarks, !!hasLab);
    if (componentsErr) return res.status(400).json({ message: componentsErr });

    const { processed, errors: marksErrors } = validateAndProcessEntries(entries, totalMarks, markComponents, !!hasLab);
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
      hasLab: !!hasLab,
      markComponents: markComponents || undefined,
      entries: processed,
      status: 'draft',
    });
    await sheet.save();
    res.status(201).json({ message: 'Result sheet saved as draft.', sheet });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/teacher/result-sheets/template — downloads a blank Excel mark
// sheet for one of the teacher's classes, in the university's standard lab /
// non-lab layout, pre-filled with the real approved class roster.
//
// NOTE: this must stay registered before GET /result-sheets/:id below — Express
// matches routes in declaration order, and :id would otherwise swallow the
// literal path segment "template" as if it were an id.
router.get('/result-sheets/template', verifyTeacherToken, async (req, res) => {
  try {
    const { ongoingClassId } = req.query;
    if (!ongoingClassId) return res.status(400).json({ message: 'ongoingClassId is required.' });
    const oc = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
    if (!oc) return res.status(403).json({ message: 'Class not found or not assigned to you.' });

    const hasLab = req.query.hasLab === 'true';
    const examType = req.query.examType || 'Final';
    const mc = parseMarkComponentsFromQuery(req.query, hasLab);
    const componentsErr = validateMarkComponents(mc, 100, hasLab);
    if (componentsErr) return res.status(400).json({ message: componentsErr });

    const teacher = await Teacher.findById(req.user.id).select('fullName');
    const roster = await fetchApprovedRoster(oc);

    const headerCols = hasLab
      ? ['S.No', 'Enrollment No.', 'Student Name', 'Sessional Marks', 'Lab', 'Mid-Term Result', 'Final-Term Result', 'TOTAL OBTAINED MARKS']
      : ['S.No', 'Enrollment No.', 'Student Name', 'Quiz', 'Presentation', 'Assignment', 'Mid-Term Result', 'Final-Term Result', 'TOTAL OBTAINED MARKS'];
    const lastCol = String.fromCharCode('A'.charCodeAt(0) + headerCols.length - 1);
    const thin = { style: 'thin' };
    const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Result Sheet');
    sheet.columns = headerCols.map((_, i) => ({ width: i === 2 ? 26 : i === 1 ? 16 : 14 }));

    function mergedRow(text, size) {
      const r = sheet.addRow([text]);
      sheet.mergeCells(`A${r.number}:${lastCol}${r.number}`);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(1).font = { bold: true, size };
      return r;
    }

    mergedRow('UNIVERSITY OF MAKRAN - PANJGUR', 16);
    mergedRow(`DEPARTMENT OF ${(oc.department || '').toUpperCase()}`, 13);
    mergedRow(`RESULT OF ${examType.toUpperCase()}-TERM HELD ON DD-MM-YYYY`, 12);
    sheet.addRow([]);
    sheet.addRow([`Subject: (${oc.subject})`]).getCell(1).font = { bold: true };
    sheet.addRow([`Program: ${oc.program || ''}`, '', '', `Session: ${oc.academicSession || ''}`]).font = { bold: true };
    sheet.addRow([]);

    const headerRow = sheet.addRow(headerCols);
    headerRow.eachCell((c) => {
      c.font = { bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7C6D9' } };
      c.border = allBorders;
    });

    const maxRowValues = hasLab
      ? ['', '', '', mc.sessionalMax, mc.labMax, mc.midMax, mc.finalMax, 100]
      : ['', '', '', mc.quizMax, mc.presentationMax, mc.assignmentMax, mc.midMax, mc.finalMax, 100];
    sheet.addRow(maxRowValues).eachCell((c) => { c.font = { bold: true }; c.alignment = { horizontal: 'center' }; c.border = allBorders; });

    roster.forEach((s, i) => {
      sheet.addRow([i + 1, s.registrationNo, s.fullName]).eachCell((c) => { c.border = allBorders; });
    });

    sheet.addRow([]);
    sheet.addRow(['Name of Course Supervisor:', teacher?.fullName || '']);
    sheet.addRow([]);
    sheet.addRow(['Signature of Course Supervisor', '', '', 'Verified by HoD / Director:']);

    const safeSubject = (oc.subject || 'subject').replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ResultSheet_${safeSubject}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
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

    const { examType, entries, hasLab, markComponents } = req.body;
    if (examType !== undefined) sheet.examType = examType;
    if (hasLab !== undefined) sheet.hasLab = !!hasLab;
    if (markComponents !== undefined) sheet.markComponents = markComponents || undefined;
    if (entries !== undefined) {
      const activeHasLab = hasLab !== undefined ? !!hasLab : !!sheet.hasLab;
      const sheetUsesBreakdown = sheet.markComponents && (sheet.markComponents.sessionalMax != null || sheet.markComponents.quizMax != null);
      const activeComponents = markComponents !== undefined ? markComponents : (sheetUsesBreakdown ? sheet.markComponents : undefined);
      const componentsErr = validateMarkComponents(activeComponents, sheet.totalMarks || 100, activeHasLab);
      if (componentsErr) return res.status(400).json({ message: componentsErr });

      const { processed, errors: marksErrors } = validateAndProcessEntries(entries, sheet.totalMarks || 100, activeComponents, activeHasLab);
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

// POST /api/portal/teacher/result-sheets/import — parse an uploaded Excel mark
// sheet and create a new draft result sheet from it. Every row goes through the
// exact same validation as a manually-typed sheet (real-student check, mark-range
// check, grade/GPA calc) — nothing from the file is trusted blindly.
router.post('/result-sheets/import', verifyTeacherToken, excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const teacher = await Teacher.findById(req.user.id).select('fullName teacherId');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

    const { ongoingClassId, examType } = req.body;
    if (!ongoingClassId) return res.status(400).json({ message: 'Please select a class.' });
    const oc = await OngoingClass.findOne({ _id: ongoingClassId, teacher: req.user.id });
    if (!oc) return res.status(403).json({ message: 'Class not found or not assigned to you.' });

    const hasLab = req.body.hasLab === 'true' || req.body.hasLab === true;
    const totalMarks = 100;
    const markComponents = parseMarkComponentsFromQuery(req.body, hasLab);
    const componentsErr = validateMarkComponents(markComponents, totalMarks, hasLab);
    if (componentsErr) return res.status(400).json({ message: componentsErr });

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(req.file.buffer);
    } catch {
      return res.status(400).json({ message: 'Could not read this file. Please upload a valid .xlsx file.' });
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ message: 'The uploaded file has no worksheet.' });

    // Locate the header row: the first row with both an "enrollment/reg no"
    // column and a "student name" column, scanning column-agnostically since
    // both the lab and non-lab templates (and hand-edited copies) can shift
    // the starting column.
    let headerRowNum = null;
    let colMap = null;
    for (let r = 1; r <= Math.min(sheet.rowCount, 30); r++) {
      const row = sheet.getRow(r);
      const cols = {};
      row.eachCell((cell, colNumber) => {
        const text = String(cell.value ?? '').trim().toLowerCase();
        if (!text) return;
        if (/enroll|reg(istration)?\.?\s*no/.test(text) && cols.regNo === undefined) cols.regNo = colNumber;
        else if (/student\s*name|^name$/.test(text) && cols.name === undefined) cols.name = colNumber;
        else if (/session/.test(text) && cols.sessional === undefined) cols.sessional = colNumber;
        else if (/^lab/.test(text) && cols.lab === undefined) cols.lab = colNumber;
        else if (/quiz/.test(text) && cols.quiz === undefined) cols.quiz = colNumber;
        else if (/present/.test(text) && cols.presentation === undefined) cols.presentation = colNumber;
        else if (/assign/.test(text) && cols.assignment === undefined) cols.assignment = colNumber;
        else if (/mid/.test(text) && cols.mid === undefined) cols.mid = colNumber;
        else if (/final/.test(text) && cols.final === undefined) cols.final = colNumber;
      });
      if (cols.regNo !== undefined && cols.name !== undefined) { headerRowNum = r; colMap = cols; break; }
    }
    if (!headerRowNum) {
      return res.status(400).json({ message: 'Could not find "Enrollment No." / "Student Name" columns in this file. Please use the downloaded template.' });
    }

    const cellValue = (row, colIndex) => {
      if (!colIndex) return '';
      const v = row.getCell(colIndex).value;
      return v === null || v === undefined ? '' : v;
    };

    const entries = [];
    for (let r = headerRowNum + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const regNo = String(cellValue(row, colMap.regNo)).trim();
      const name = String(cellValue(row, colMap.name)).trim();
      if (!regNo || !name) continue; // skips the max-marks row, blank rows, and footer rows
      entries.push(hasLab ? {
        registrationNo: regNo,
        studentName: name,
        sessionalMarks: cellValue(row, colMap.sessional),
        labMarks: cellValue(row, colMap.lab),
        midMarks: cellValue(row, colMap.mid),
        finalMarks: cellValue(row, colMap.final),
      } : {
        registrationNo: regNo,
        studentName: name,
        quizMarks: cellValue(row, colMap.quiz),
        presentationMarks: cellValue(row, colMap.presentation),
        assignmentMarks: cellValue(row, colMap.assignment),
        midMarks: cellValue(row, colMap.mid),
        finalMarks: cellValue(row, colMap.final),
      });
    }
    if (!entries.length) {
      return res.status(400).json({ message: 'No student rows were found below the header in this file.' });
    }

    const { processed, errors: marksErrors } = validateAndProcessEntries(entries, totalMarks, markComponents, hasLab);
    if (marksErrors.length) {
      return res.status(400).json({ message: 'Some rows have invalid or missing marks.', errors: marksErrors });
    }
    const unknown = await findUnknownStudents(processed, oc);
    if (unknown.length) {
      return res.status(400).json({
        message: `These registration numbers from the file are not approved students in ${oc.department || 'this department'} / ${oc.program || 'this program'} / ${oc.semester || 'this semester'}: ${unknown.join(', ')}`,
      });
    }

    const resultSheet = new ResultSheet({
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
      hasLab,
      markComponents,
      entries: processed,
      status: 'draft',
    });
    await resultSheet.save();
    res.status(201).json({ message: `Imported ${processed.length} student(s) from the Excel file as a new draft.`, sheet: resultSheet });
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
// Read-only from the teacher's side — classes/subjects are assigned by the
// HOD (routes/hodPortal.js), not self-selected. Attendance, assignments, and
// result sheets still key off these records exactly as before; only who
// *creates* them changed.

// GET /api/portal/teacher/ongoing-classes
router.get('/ongoing-classes', verifyTeacherToken, async (req, res) => {
  try {
    const classes = await OngoingClass.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.sendServerError(err); }
});

// ── Timetable (read-only, own sessions only) ─────────────────────────────────
const TimetableSlot = require('../models/TimetableSlot');
const { buildGrid } = require('../utils/timetableGrid');

// GET /api/portal/teacher/timetable
router.get('/timetable', verifyTeacherToken, async (req, res) => {
  try {
    const slots = await TimetableSlot.find({ teacher: req.user.id, status: 'active' }).sort({ day: 1, startTime: 1 });
    res.json({ slots, grid: buildGrid(slots) });
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
