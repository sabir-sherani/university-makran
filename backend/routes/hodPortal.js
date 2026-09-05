const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const HOD     = require('../models/HOD');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { verifyHODToken } = require('../middleware/auth');
const {
  requiredString, optionalString, enumField, validate, mongoId, enums, numberInRange,
  programRef, sessionRef, courseRef, roomRef, snapshotRefs, nonEmptyArray, password: passwordField,
} = require('../validators');
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

// GET /api/portal/hod/students?withAttendance=true — students in HOD's
// department. `withAttendance` is opt-in (extra per-student attendance
// queries) so every existing caller of the plain endpoint is unaffected —
// only the new Students section asks for it.
router.get('/students', verifyHODToken, async (req, res) => {
  try {
    const students = await Student.find({ department: req.user.department })
      .select('-password')
      .sort({ createdAt: -1 });
    if (req.query.withAttendance !== 'true') return res.json(students);

    const settingCache = new Map();
    const enriched = await Promise.all(students.map(async (s) => {
      const classes = await OngoingClass.find(enrolledClassFilter(s)).select('_id');
      const classIds = classes.map((c) => c._id);
      let attendancePercent = null;
      if (classIds.length) {
        const sessions = await Attendance.find({ ongoingClassId: { $in: classIds } }).select('records');
        attendancePercent = overallPercent(sessions, s.registrationNo);
      }
      let minAttendancePercent = 75;
      if (s.departmentId && s.sessionId) {
        const key = `${s.departmentId}:${s.sessionId}`;
        if (!settingCache.has(key)) settingCache.set(key, await DeptSetting.getOrDefault(s.departmentId, s.sessionId));
        minAttendancePercent = settingCache.get(key).minAttendancePercent ?? 75;
      }
      const obj = s.toObject();
      obj.attendancePercent = attendancePercent;
      obj.eligible = attendancePercent == null ? null : attendancePercent >= minAttendancePercent;
      return obj;
    }));
    res.json(enriched);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/hod/students/:id/attendance — per-course drill-down for
// one student, mirroring the math routes/studentPortal.js's own GET
// /attendance uses (same summarizeSessions() rule, same DeptSetting
// threshold) from the HOD's read-only vantage point.
router.get('/students/:id/attendance', verifyHODToken, async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, department: req.user.department })
      .select('registrationNo fullName department departmentId program programId currentSemester session sessionId timeSession');
    if (!student) return res.status(404).json({ message: 'Student not found in your department.' });

    const classes = await OngoingClass.find(enrolledClassFilter(student));
    const classIds = classes.map((c) => c._id);
    const classById = new Map(classes.map((c) => [String(c._id), c]));
    const sessions = classIds.length
      ? await Attendance.find({ ongoingClassId: { $in: classIds } }).sort({ date: -1 })
      : [];

    const deptSetting = student.departmentId && student.sessionId
      ? await DeptSetting.getOrDefault(student.departmentId, student.sessionId)
      : { minAttendancePercent: 75 };
    const minAttendancePercent = deptSetting.minAttendancePercent ?? 75;

    const sessionsByClass = new Map();
    sessions.forEach((s) => {
      const key = String(s.ongoingClassId);
      if (!sessionsByClass.has(key)) sessionsByClass.set(key, []);
      sessionsByClass.get(key).push(s);
    });
    const courses = [];
    for (const [key, classSessions] of sessionsByClass) {
      const summary = summarizeSessions(classSessions).find((r) => r.registrationNo === student.registrationNo);
      if (!summary) continue;
      const cls = classById.get(key);
      courses.push({
        ongoingClassId: key, subject: cls?.subject || '', className: cls?.className || '',
        ...summary, eligible: summary.attendancePercent >= minAttendancePercent,
      });
    }

    const mySessions = sessions.map((s) => ({
      _id: s._id, ongoingClassId: s.ongoingClassId, subject: s.subject, className: s.className,
      date: s.date, isMakeup: s.isMakeup, kind: s.kind,
      status: (s.records || []).find((r) => r.registrationNo === student.registrationNo)?.status || null,
    }));

    res.json({
      student: { registrationNo: student.registrationNo, fullName: student.fullName },
      minAttendancePercent, courses, sessions: mySessions,
    });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/teachers  — teachers in HOD's department, with a
// workload column (active courses, weekly sessions, weekly contact hours)
// computed via aggregation so this stays O(1) queries regardless of how
// many teachers the department has.
router.get('/teachers', verifyHODToken, async (req, res) => {
  try {
    const teachers = await Teacher.find({ department: req.user.department })
      .select('-password')
      .sort({ createdAt: -1 });
    const teacherIds = teachers.map((t) => t._id);

    const [classAgg, slotAgg] = teacherIds.length ? await Promise.all([
      OngoingClass.aggregate([
        { $match: { teacher: { $in: teacherIds }, status: 'active' } },
        { $group: { _id: '$teacher', activeCourses: { $sum: 1 } } },
      ]),
      TimetableSlot.aggregate([
        { $match: { teacher: { $in: teacherIds }, status: 'active' } },
        { $group: { _id: '$teacher', sessionsPerWeek: { $sum: 1 }, weeklyContactMinutes: { $sum: '$durationMinutes' } } },
      ]),
    ]) : [[], []];
    const classMap = new Map(classAgg.map((r) => [String(r._id), r.activeCourses]));
    const slotMap = new Map(slotAgg.map((r) => [String(r._id), r]));

    const enriched = teachers.map((t) => {
      const obj = t.toObject();
      obj.activeCourses = classMap.get(String(t._id)) || 0;
      const slotInfo = slotMap.get(String(t._id));
      obj.sessionsPerWeek = slotInfo?.sessionsPerWeek || 0;
      obj.weeklyContactHours = slotInfo ? round2(slotInfo.weeklyContactMinutes / 60) : 0;
      return obj;
    });
    res.json(enriched);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/hod/stats — dashboard KPIs. The original four counters
// are kept exactly as they were (existing consumers keep working); Phase 6
// only ever ADDS fields, never changes/removes one (hard rule 6).
router.get('/stats', verifyHODToken, async (req, res) => {
  try {
    const dept = req.user.department;
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const deptId = hod?.departmentId;

    const [totalStudents, approvedStudents, pendingStudents, totalTeachers] = await Promise.all([
      Student.countDocuments({ department: dept }),
      Student.countDocuments({ department: dept, status: 'approved' }),
      Student.countDocuments({ department: dept, status: 'pending' }),
      Teacher.countDocuments({ department: dept }),
    ]);

    let activeCourses = 0, sessionsScheduled = 0, sessionsRequired = 0, attendancePercentThisMonth = null,
      pendingApprovals = pendingStudents, atRiskStudents = 0, todaysClasses = [];

    if (deptId) {
      const [courseCount, pendingCr, activeClasses] = await Promise.all([
        Course.countDocuments({ departmentId: deptId, isActive: true }),
        CorrectionRequest.countDocuments({ department: dept, status: 'pending' }),
        OngoingClass.find({ departmentId: deptId, status: 'active' }),
      ]);
      activeCourses = courseCount;
      pendingApprovals += pendingCr;

      const classIds = activeClasses.map((c) => c._id);
      const [slotCount, requiredCounts] = await Promise.all([
        classIds.length ? TimetableSlot.countDocuments({ ongoingClass: { $in: classIds }, status: 'active' }) : 0,
        Promise.all(activeClasses.map((c) => requiredSessionsFor({ creditHours: c.creditHours, isLab: c.isLab, departmentId: c.departmentId }))),
      ]);
      sessionsScheduled = slotCount;
      sessionsRequired = requiredCounts.reduce((sum, r) => sum + r.length, 0);

      const monthly = await getMonthlyReport({ departmentId: deptId, department: dept, month: new Date().toISOString().slice(0, 7) });
      attendancePercentThisMonth = monthly.totals.averageAttendance;
      atRiskStudents = monthly.totals.defaultersCount;

      const JS_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = JS_DAY_NAMES[new Date().getDay()];
      if (DAYS.includes(todayName)) {
        todaysClasses = await TimetableSlot.find({ departmentId: deptId, day: todayName, status: 'active' })
          .sort({ startTime: 1 })
          .select('subject teacherName room startTime endTime kind');
      }
    }

    res.json({
      totalStudents, approvedStudents, pendingStudents, totalTeachers,
      activeCourses, sessionsScheduled, sessionsRequired, attendancePercentThisMonth,
      pendingApprovals, atRiskStudents, todaysClasses,
    });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ─── Correction Requests ──────────────────────────────────────────────────────
const CorrectionRequest = require('../models/CorrectionRequest');
const ResultSheet       = require('../models/ResultSheet');
const Attendance        = require('../models/Attendance');
const Course            = require('../models/Course');
const { notify }        = require('../utils/notify');
const { summarizeSessions, overallPercent } = require('../utils/attendanceSummary');
const { enrolledClassFilter } = require('../utils/enrollment');
const { round2 } = require('../utils/grading');
const {
  getMonthlyReport, getSemesterReport, getExamEligibility, getCalendarEvents, writeReportSheet,
} = require('../utils/reports');

// GET /api/portal/hod/correction-requests?status=&type=  — scoped to HOD's own department
router.get('/correction-requests', verifyHODToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = { department: req.user.department };
    if (status) filter.status = status;
    if (type)   filter.type   = type;
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

    // Attendance branch (Phase 5) — approving must actually flip the
    // student's record on the underlying Attendance document before the
    // request itself is marked approved, and never silently succeed if that
    // document (or the student's row on it) is gone.
    let attendance = null;
    if (cr.type === 'attendance' && status === 'approved') {
      attendance = await Attendance.findById(cr.attendanceSession);
      if (!attendance) {
        return res.status(409).json({ message: 'The underlying attendance record no longer exists — this request cannot be approved.' });
      }
      const record = (attendance.records || []).find((r) => r.registrationNo === cr.studentRegistrationNo);
      if (!record) {
        return res.status(409).json({ message: 'This student is no longer on that attendance record — this request cannot be approved.' });
      }
      const before = { registrationNo: record.registrationNo, status: record.status };
      record.status = cr.requestedStatus;
      await attendance.save();
      cr.appliedAt = new Date();
      await logAudit(req, {
        action: 'attendance.correctionApplied', entityType: 'Attendance', entityId: attendance._id,
        entityLabel: `${attendance.subject} — ${before.registrationNo}`,
        before, after: { registrationNo: record.registrationNo, status: record.status },
      });
    }

    cr.status          = status;
    cr.reviewedBy      = req.user.id;
    cr.reviewerRole    = 'hod';
    cr.reviewerComment = reviewerComment || '';
    cr.reviewedAt      = new Date();
    await cr.save();

    // result-sheet branch — unchanged from before Phase 5.
    if (status === 'approved' && cr.type === 'result-sheet') {
      await ResultSheet.findByIdAndUpdate(cr.resultSheet, { status: 'draft' });
    }

    await logAudit(req, {
      action: `correctionRequest.${status}`, entityType: 'CorrectionRequest', entityId: cr._id,
      entityLabel: `${cr.subject || cr.studentName || ''}`, before: { status: 'pending' }, after: { status, reviewerComment: cr.reviewerComment },
    });

    if (cr.type === 'attendance' && cr.student) {
      await notify({
        recipientRole: 'student', recipient: cr.student, category: 'approval', priority: 'important',
        title: `Attendance correction ${status}`,
        body: `Your request to change ${cr.currentStatus} → ${cr.requestedStatus} for ${cr.subject || 'your class'} on ${new Date(cr.classDate).toDateString()} was ${status}.${reviewerComment ? ` HOD note: ${reviewerComment}` : ''}`,
        link: '/portal/student?tab=attendance',
        entityType: 'CorrectionRequest', entityId: cr._id,
      });
      if (attendance?.teacher) {
        await notify({
          recipientRole: 'teacher', recipient: attendance.teacher, category: 'attendance', priority: 'normal',
          title: `Attendance record updated — ${attendance.subject}`,
          body: `${cr.studentName} (${cr.studentRegistrationNo})'s attendance for ${new Date(cr.classDate).toDateString()} was changed to ${cr.requestedStatus} following an approved correction request.`,
          link: '/portal/teacher?tab=attendance',
          entityType: 'Attendance', entityId: attendance._id,
        });
      }
    }

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
    const { semester, status, timeSession, teacherId } = req.query;
    if (semester)    f.semester    = semester;
    if (status)      f.status      = status;
    if (timeSession) f.timeSession = timeSession;
    if (teacherId)   f.teacher     = teacherId;
    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.sendServerError(err); }
});

// ── Class / Subject Assignment ────────────────────────────────────────────
// The HOD — not the teacher — assigns which subjects/classes a teacher
// takes. A teacher may hold at most 4 active subjects at once; the HOD can
// grant an individual teacher a one-off exception raising that to 5 via
// PATCH /teachers/:id/subject-allowance below.
const DEFAULT_SUBJECT_CAP = 4;
const OVERRIDE_SUBJECT_CAP = 5;
const HOD_ONGOING_CLASS_FIELDS = [
  'className', 'subject', 'semester', 'timeSession',
  'days', 'startTime', 'endTime', 'room', 'location', 'weeklyHours', 'maxStudents', 'status',
];

// POST /api/portal/hod/ongoing-classes — assign a subject to a teacher in the HOD's own department
router.post('/ongoing-classes', verifyHODToken, [
  mongoId('teacherId'),
  requiredString('className', { max: 120 }),
  requiredString('subject', { max: 120 }),
  courseRef({ optional: true }),
  roomRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    const teacher = await Teacher.findOne({ _id: req.body.teacherId, department: hod.department });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found in your department.' });

    const activeCount = await OngoingClass.countDocuments({ teacher: teacher._id, status: 'active' });
    const cap = teacher.extraSubjectAllowed ? OVERRIDE_SUBJECT_CAP : DEFAULT_SUBJECT_CAP;
    if (activeCount >= cap) {
      return res.status(400).json({
        message: `${teacher.fullName} already has ${activeCount} active subjects (limit ${cap}).`
          + (teacher.extraSubjectAllowed ? '' : ' Grant a 5th-subject allowance from the Teachers tab to raise the limit.'),
      });
    }

    const data = {};
    HOD_ONGOING_CLASS_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    snapshotRefs(req, data);
    // snapshotRefs() only writes {courseId, courseCode, subject} — creditHours
    // and isLab aren't part of its generic mapping (no other consumer needs
    // them snapshotted), so pull those off the resolved course directly.
    const resolvedCourse = req.resolvedRefs?.course;
    if (resolvedCourse) {
      data.creditHours = resolvedCourse.creditHours;
      data.isLab = resolvedCourse.isLab;
    }

    const cls = await new OngoingClass({
      ...data,
      department:    hod.department,
      departmentId:  hod.departmentId,
      teacher:       teacher._id,
      teacherName:   teacher.fullName,
      teacherId:     teacher.teacherId,
      createdBy:     req.user.id,
      createdByRole: 'hod',
    }).save();

    await logAudit(req, {
      action: 'ongoingClass.assign', entityType: 'OngoingClass', entityId: cls._id,
      entityLabel: `${cls.subject} → ${teacher.fullName}`, after: cls.toObject(),
    });

    res.status(201).json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/hod/ongoing-classes/:id
router.patch('/ongoing-classes/:id', verifyHODToken, [
  optionalString('className', { max: 120 }),
  optionalString('subject', { max: 120 }),
  courseRef({ optional: true }),
  roomRef({ optional: true }),
  programRef({ optional: true }),
  sessionRef({ optional: true }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  enumField('status', ['active', 'completed', 'cancelled', 'on-hold'], { optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const data = {};
    HOD_ONGOING_CLASS_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    snapshotRefs(req, data);
    const resolvedCourse = req.resolvedRefs?.course;
    if (resolvedCourse) {
      data.creditHours = resolvedCourse.creditHours;
      data.isLab = resolvedCourse.isLab;
    }
    const cls = await OngoingClass.findOneAndUpdate(
      { _id: req.params.id, department: hod.department },
      data, { new: true, runValidators: true },
    );
    if (!cls) return res.status(404).json({ message: 'Class not found or access denied.' });
    res.json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/hod/ongoing-classes/:id — unassign a subject from a teacher
router.delete('/ongoing-classes/:id', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const cls = await OngoingClass.findOneAndDelete({ _id: req.params.id, department: hod.department });
    if (!cls) return res.status(404).json({ message: 'Class not found or access denied.' });
    res.json({ message: 'Class unassigned.' });
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/hod/teachers/:id/subject-allowance — grant/revoke the 5th-subject exception
router.patch('/teachers/:id/subject-allowance', verifyHODToken, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, department: req.user.department });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found in your department.' });
    teacher.extraSubjectAllowed = !!req.body.allowed;
    await teacher.save();
    await logAudit(req, {
      action: 'teacher.subjectAllowance', entityType: 'Teacher', entityId: teacher._id,
      entityLabel: teacher.fullName, after: { extraSubjectAllowed: teacher.extraSubjectAllowed },
    });
    res.json({
      message: teacher.extraSubjectAllowed ? '5th-subject allowance granted.' : '5th-subject allowance revoked.',
      extraSubjectAllowed: teacher.extraSubjectAllowed,
    });
  } catch (err) { res.sendServerError(err); }
});

// ── Credit-hour policies (department-scoped overrides of the university default) ──
const CreditHourPolicy = require('../models/CreditHourPolicy');
const CREDIT_HOUR_COMBOS = [
  { creditHours: 1, isLab: false }, { creditHours: 2, isLab: false },
  { creditHours: 3, isLab: false }, { creditHours: 3, isLab: true },
  { creditHours: 4, isLab: false }, { creditHours: 4, isLab: true },
];

// GET /api/portal/hod/credit-hour-policies — every (creditHours, isLab)
// combination, with the HOD's own department override where one exists,
// falling back to the university-wide default otherwise. `isOverride` tells
// the UI which rows are department-specific vs inherited.
router.get('/credit-hour-policies', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    const [overrides, defaults] = await Promise.all([
      CreditHourPolicy.find({ departmentId: hod.departmentId, isActive: true }),
      CreditHourPolicy.find({ departmentId: null, isActive: true }),
    ]);
    const overrideMap = new Map(overrides.map((p) => [`${p.creditHours}:${p.isLab}`, p]));
    const defaultMap = new Map(defaults.map((p) => [`${p.creditHours}:${p.isLab}`, p]));

    const policies = CREDIT_HOUR_COMBOS.map(({ creditHours, isLab }) => {
      const key = `${creditHours}:${isLab}`;
      const source = overrideMap.get(key) || defaultMap.get(key);
      return {
        creditHours, isLab,
        sessions: source?.sessions || [],
        isOverride: overrideMap.has(key),
      };
    });
    res.json(policies);
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/hod/credit-hour-policies — upsert a department-specific
// override for one (creditHours, isLab) combination. Body: { creditHours,
// isLab, sessions: [{kind,durationMinutes,count}] }. Does not touch the
// university-wide default — every other department is unaffected.
router.patch('/credit-hour-policies', verifyHODToken, [
  numberInRange('creditHours', { min: 1, max: 6, optional: false }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    if (!hod.departmentId) return res.status(400).json({ message: 'Your account has no department set — contact admin.' });

    const isLab = !!req.body.isLab;
    const sessions = Array.isArray(req.body.sessions) ? req.body.sessions : [];
    for (const s of sessions) {
      if (!['theory', 'lab'].includes(s.kind) || !(s.durationMinutes > 0) || !(s.count > 0)) {
        return res.status(400).json({ message: 'Each session needs a valid kind (theory/lab), durationMinutes, and count.' });
      }
    }

    const before = await CreditHourPolicy.findOne({ departmentId: hod.departmentId, creditHours: req.body.creditHours, isLab });
    const policy = await CreditHourPolicy.findOneAndUpdate(
      { departmentId: hod.departmentId, creditHours: req.body.creditHours, isLab },
      { $set: { department: hod.department, sessions, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
    await logAudit(req, {
      action: 'creditHourPolicy.upsert', entityType: 'CreditHourPolicy', entityId: policy._id,
      entityLabel: `${hod.department} — ${req.body.creditHours}cr${isLab ? ' lab' : ''}`,
      before: before ? { sessions: before.sessions } : null, after: { sessions: policy.sessions },
    });
    res.json(policy);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── Department settings (per department + academic session) ──────────────
const DeptSetting = require('../models/DeptSetting');

// GET /api/portal/hod/settings?session=<sessionId>
router.get('/settings', verifyHODToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.query.session)) {
      return res.status(400).json({ message: 'A valid session id is required (?session=<id>).' });
    }
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    if (!hod.departmentId) return res.status(400).json({ message: 'Your account has no department set — contact admin.' });
    const setting = await DeptSetting.getOrDefault(hod.departmentId, req.query.session);
    res.json(setting);
  } catch (err) { res.sendServerError(err); }
});

const DEPT_SETTING_FIELDS = [
  'minAttendancePercent', 'absenceAlertEnabled', 'alsoAlertOnLate', 'consecutiveAbsenceAlertThreshold',
  'attendanceCorrectionWindowDays', 'documentReminderHours', 'resultSheetGraceDays', 'workingDays', 'morningWindow', 'eveningWindow',
  'slotGranularityMinutes',
];

// PATCH /api/portal/hod/settings — body must include `session` (sessionId);
// upserts the HOD's own department's settings for that session. Every field
// besides `session` is optional — only what's sent gets updated.
router.patch('/settings', verifyHODToken, [
  mongoId('session'),
  numberInRange('minAttendancePercent', { min: 0, max: 100, optional: true }),
  numberInRange('consecutiveAbsenceAlertThreshold', { min: 1, max: 30, optional: true }),
  numberInRange('attendanceCorrectionWindowDays', { min: 1, max: 90, optional: true }),
  numberInRange('documentReminderHours', { min: 1, max: 720, optional: true }),
  numberInRange('resultSheetGraceDays', { min: 0, max: 90, optional: true }),
  numberInRange('slotGranularityMinutes', { min: 5, max: 120, optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    if (!hod.departmentId) return res.status(400).json({ message: 'Your account has no department set — contact admin.' });

    const before = await DeptSetting.findOne({ departmentId: hod.departmentId, sessionId: req.body.session });
    const updates = { department: hod.department };
    DEPT_SETTING_FIELDS.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const setting = await DeptSetting.findOneAndUpdate(
      { departmentId: hod.departmentId, sessionId: req.body.session },
      { $set: updates },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
    await logAudit(req, {
      action: 'deptSetting.update', entityType: 'DeptSetting', entityId: setting._id,
      entityLabel: `${hod.department} settings`,
      before: before ? before.toObject() : null, after: updates,
    });
    res.json(setting);
  } catch (err) { res.status(400).json({ message: err.message }); }
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

// ── Rooms (department-scoped) ──────────────────────────────────────────────
// HODs manage their own department's rooms only; shared/university-wide
// rooms (departmentId: null, created by admin) are visible read-only.
const Room = require('../models/Room');

// GET /api/portal/hod/rooms?type=
router.get('/rooms', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const filter = { deletedAt: null, $or: [{ departmentId: hod.departmentId }, { departmentId: null }] };
    if (req.query.type) filter.type = req.query.type;
    const rooms = await Room.find(filter).sort({ code: 1 });
    res.json(rooms);
  } catch (err) { res.sendServerError(err); }
});

router.post('/rooms', verifyHODToken, [
  requiredString('code', { max: 20 }),
  requiredString('name', { max: 120 }),
  optionalString('building', { max: 120 }),
  numberInRange('capacity', { min: 1, max: 2000, optional: true }),
  enumField('type', ['classroom', 'lab', 'seminar'], { optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    if (!hod.departmentId) return res.status(400).json({ message: 'Your account has no department set — contact admin.' });
    const { code, name, building, capacity, type } = req.body;
    const room = await new Room({
      code, name, building: building || '', type: type || 'classroom',
      capacity: capacity !== undefined ? capacity : undefined,
      departmentId: hod.departmentId, department: hod.department,
    }).save();
    await logAudit(req, {
      action: 'room.create', entityType: 'Room', entityId: room._id,
      entityLabel: `${room.code} — ${room.name}`, after: room.toObject(),
    });
    res.status(201).json(room);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'A room with this code already exists.' });
    res.status(400).json({ message: err.message });
  }
});

router.patch('/rooms/:id', verifyHODToken, [
  optionalString('code', { max: 20 }),
  optionalString('name', { max: 120 }),
  optionalString('building', { max: 120 }),
  numberInRange('capacity', { min: 1, max: 2000, optional: true }),
  enumField('type', ['classroom', 'lab', 'seminar'], { optional: true }),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const room = await Room.findOne({ _id: req.params.id, departmentId: hod.departmentId });
    if (!room) return res.status(404).json({ message: 'Room not found or access denied.' });
    const before = room.toObject();
    const { code, name, building, capacity, type, isActive } = req.body;
    if (code !== undefined) room.code = code;
    if (name !== undefined) room.name = name;
    if (building !== undefined) room.building = building;
    if (capacity !== undefined) room.capacity = capacity;
    if (type !== undefined) room.type = type;
    if (isActive !== undefined) room.isActive = !!isActive;
    await room.save();
    await logAudit(req, {
      action: 'room.update', entityType: 'Room', entityId: room._id,
      entityLabel: `${room.code} — ${room.name}`, before, after: room.toObject(),
    });
    res.json(room);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'A room with this code already exists.' });
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/portal/hod/rooms/:id — soft delete, own department only
router.delete('/rooms/:id', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, departmentId: hod.departmentId },
      { deletedAt: new Date(), isActive: false }, { new: true },
    );
    if (!room) return res.status(404).json({ message: 'Room not found or access denied.' });
    await logAudit(req, { action: 'room.delete', entityType: 'Room', entityId: room._id, entityLabel: `${room.code} — ${room.name}` });
    res.json({ message: 'Room deleted.' });
  } catch (err) { res.sendServerError(err); }
});

// ── Timetable ───────────────────────────────────────────────────────────────
// See PART 2, section 2.2-2.7 of prompts/phase-2.md for the full design: one
// TimetableSlot document per weekly recurring session, hard clash detection
// (utils/timetableClash.js), and an auto-suggest engine (utils/timetableSuggest.js)
// that proposes candidates for the HOD to accept/edit/skip — nothing is ever
// scheduled without going through the same findClashes() check every route
// below uses.
const TimetableSlot = require('../models/TimetableSlot');
// DeptSetting is already required above (── Department settings ──).
const { findClashes, findBatchClashes, findWarnings, addMinutes } = require('../utils/timetableClash');
const { suggestSlots, buildCandidateSlot } = require('../utils/timetableSuggest');
const { buildGrid, DAYS, parseSemesterNumber } = require('../utils/timetableGrid');
const { requiredSessionsFor } = require('../utils/creditHours');

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIMETABLE_KINDS = ['theory', 'lab'];

// GET /api/portal/hod/timetable?sessionId=&programId=&semesterNumber=&timeSession=&teacherId=&roomId=&day=
router.get('/timetable', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const f = { departmentId: hod.departmentId, status: 'active' };
    const { sessionId, programId, semesterNumber, timeSession, teacherId, roomId, day } = req.query;
    if (sessionId) f.sessionId = sessionId;
    if (programId) f.programId = programId;
    if (semesterNumber) f.semesterNumber = Number(semesterNumber);
    if (timeSession) f.timeSession = timeSession;
    if (teacherId) f.teacher = teacherId;
    if (roomId) f.roomId = roomId;
    if (day) f.day = day;
    const slots = await TimetableSlot.find(f).sort({ day: 1, startTime: 1 });
    res.json({ slots, grid: buildGrid(slots) });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/timetable/requirements?sessionId=&programId=&semesterNumber=
// Per-course required-vs-scheduled counts, e.g. "CS-301 (3CR) has 1 of 2
// sessions scheduled" — drives the HOD's requirements panel.
router.get('/timetable/requirements', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    const { sessionId, programId, semesterNumber } = req.query;
    const semNum = Number(semesterNumber);
    if (!mongoose.isValidObjectId(sessionId) || !mongoose.isValidObjectId(programId) || !Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
      return res.status(400).json({ message: 'sessionId, programId and a valid semesterNumber (1-8) are required.' });
    }

    const classes = await OngoingClass.find({ department: hod.department, programId, sessionId, status: 'active' });
    const relevant = classes.filter((c) => parseSemesterNumber(c.semester) === semNum);

    const scheduledCounts = await TimetableSlot.aggregate([
      { $match: { ongoingClass: { $in: relevant.map((c) => c._id) }, status: 'active' } },
      { $group: { _id: '$ongoingClass', count: { $sum: 1 } } },
    ]);
    const scheduledMap = new Map(scheduledCounts.map((r) => [String(r._id), r.count]));

    const rows = await Promise.all(relevant.map(async (c) => {
      const required = await requiredSessionsFor({ creditHours: c.creditHours, isLab: c.isLab, departmentId: c.departmentId });
      const scheduled = scheduledMap.get(String(c._id)) || 0;
      return {
        ongoingClassId: c._id, subject: c.subject, courseCode: c.courseCode,
        teacherName: c.teacherName, creditHours: c.creditHours, isLab: c.isLab,
        required: required.length, scheduled, shortfall: Math.max(0, required.length - scheduled),
      };
    }));

    res.json(rows);
  } catch (err) { res.sendServerError(err); }
});

// Shared by POST /timetable and POST /timetable/bulk — refuses to schedule
// anything for a class outside the HOD's own department or one that's
// cancelled/completed.
async function loadSchedulableClass(hodDepartment, ongoingClassId) {
  const oc = await OngoingClass.findOne({ _id: ongoingClassId, department: hodDepartment });
  if (!oc) return { error: 'Class not found or outside your department.' };
  if (['cancelled', 'completed'].includes(oc.status)) return { error: `Cannot schedule a ${oc.status} class.` };
  if (!oc.departmentId || !oc.programId || !oc.sessionId || !oc.timeSession) {
    return { error: "This class needs a department, program, academic session and time session set before a slot can be scheduled." };
  }
  return { oc };
}

// POST /api/portal/hod/timetable/suggest  { ongoingClassId }
router.post('/timetable/suggest', verifyHODToken, [mongoId('ongoingClassId'), validate], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const { oc, error } = await loadSchedulableClass(hod.department, req.body.ongoingClassId);
    if (error) return res.status(400).json({ message: error });
    const payload = await suggestSlots({ ongoingClassId: oc._id });
    res.json(payload);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST /api/portal/hod/timetable  { ongoingClassId, kind, day, startTime, durationMinutes, roomId }
router.post('/timetable', verifyHODToken, [
  mongoId('ongoingClassId'),
  enumField('kind', TIMETABLE_KINDS),
  enumField('day', DAYS),
  requiredString('startTime', { min: 5, max: 5 }),
  numberInRange('durationMinutes', { min: 15, max: 240, optional: false }),
  roomRef(),
  validate,
], async (req, res) => {
  try {
    if (!HHMM_REGEX.test(req.body.startTime)) {
      return res.status(400).json({ message: 'startTime must be in 24h HH:mm format.' });
    }
    const hod = await HOD.findById(req.user.id).select('department');
    const { oc, error } = await loadSchedulableClass(hod.department, req.body.ongoingClassId);
    if (error) return res.status(400).json({ message: error });

    const room = req.resolvedRefs.room;
    if (room.departmentId && String(room.departmentId) !== String(oc.departmentId)) {
      return res.status(400).json({ message: "This room does not belong to this class's department." });
    }

    const candidate = buildCandidateSlot(oc, {
      kind: req.body.kind, day: req.body.day, startTime: req.body.startTime,
      durationMinutes: req.body.durationMinutes, room,
    });

    const conflicts = await findClashes(candidate);
    if (conflicts.length) return res.status(409).json({ message: 'This slot conflicts with an existing booking.', conflicts });

    const [deptSetting, sectionStudentCount] = await Promise.all([
      DeptSetting.getOrDefault(oc.departmentId, oc.sessionId),
      Student.countDocuments({ programId: oc.programId, currentSemester: candidate.semesterNumber, timeSession: oc.timeSession, status: 'approved' }),
    ]);
    const warnings = await findWarnings(candidate, { deptSetting, room, sectionStudentCount });

    const slot = await new TimetableSlot({ ...candidate, createdBy: req.user.id, createdByRole: 'hod' }).save();
    await logAudit(req, {
      action: 'timetableSlot.create', entityType: 'TimetableSlot', entityId: slot._id,
      entityLabel: `${slot.subject} — ${slot.day} ${slot.startTime}`, after: slot.toObject(),
    });
    res.status(201).json({ slot, warnings });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// POST /api/portal/hod/timetable/bulk  { slots: [{ongoingClassId, kind, day, startTime, durationMinutes, roomId}, ...] }
// All-or-nothing: every row is validated against the DB *and* against every
// other row in the same batch before anything is inserted.
router.post('/timetable/bulk', verifyHODToken, [nonEmptyArray('slots'), validate], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department');
    const rows = req.body.slots;

    const ocIds = [...new Set(rows.map((r) => r.ongoingClassId).filter((id) => mongoose.isValidObjectId(id)))];
    const roomIds = [...new Set(rows.map((r) => r.roomId).filter((id) => mongoose.isValidObjectId(id)))];
    const [classes, rooms] = await Promise.all([
      OngoingClass.find({ _id: { $in: ocIds }, department: hod.department }),
      Room.find({ _id: { $in: roomIds }, isActive: true, deletedAt: null }),
    ]);
    const classMap = new Map(classes.map((c) => [String(c._id), c]));
    const roomMap = new Map(rooms.map((r) => [String(r._id), r]));

    const candidates = [];
    const rowErrors = [];
    rows.forEach((row, i) => {
      const oc = classMap.get(String(row.ongoingClassId));
      const room = roomMap.get(String(row.roomId));
      if (!oc) { rowErrors.push(`Row ${i + 1}: class not found or outside your department.`); return; }
      if (['cancelled', 'completed'].includes(oc.status)) { rowErrors.push(`Row ${i + 1}: cannot schedule a ${oc.status} class.`); return; }
      if (!oc.departmentId || !oc.programId || !oc.sessionId || !oc.timeSession) { rowErrors.push(`Row ${i + 1}: class is missing department/program/session/time-session.`); return; }
      if (!room) { rowErrors.push(`Row ${i + 1}: room not found or inactive.`); return; }
      if (room.departmentId && String(room.departmentId) !== String(oc.departmentId)) { rowErrors.push(`Row ${i + 1}: room does not belong to this class's department.`); return; }
      if (!TIMETABLE_KINDS.includes(row.kind) || !DAYS.includes(row.day) || !HHMM_REGEX.test(row.startTime) || !(Number(row.durationMinutes) >= 15)) {
        rowErrors.push(`Row ${i + 1}: invalid kind/day/startTime/durationMinutes.`); return;
      }
      candidates.push(buildCandidateSlot(oc, {
        kind: row.kind, day: row.day, startTime: row.startTime, durationMinutes: Number(row.durationMinutes), room,
      }));
    });
    if (rowErrors.length) return res.status(400).json({ message: 'Some rows are invalid.', errors: rowErrors });

    const batchConflicts = findBatchClashes(candidates);
    if (batchConflicts.length) {
      return res.status(409).json({ message: 'Some rows in this batch conflict with each other.', conflicts: batchConflicts.map((c) => c.message) });
    }
    const dbConflicts = [];
    for (let i = 0; i < candidates.length; i++) {
      const conflicts = await findClashes(candidates[i]); // eslint-disable-line no-await-in-loop
      if (conflicts.length) dbConflicts.push(`Row ${i + 1}: ${conflicts.join(' ')}`);
    }
    if (dbConflicts.length) {
      return res.status(409).json({ message: 'Some rows conflict with existing bookings.', conflicts: dbConflicts });
    }

    const created = await TimetableSlot.insertMany(candidates.map((c) => ({ ...c, createdBy: req.user.id, createdByRole: 'hod' })));
    await logAudit(req, {
      action: 'timetableSlot.bulkCreate', entityType: 'TimetableSlot',
      entityLabel: `${created.length} slot(s)`, after: { count: created.length },
    });
    res.status(201).json({ message: `${created.length} slot(s) created.`, slots: created });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/hod/timetable/:id
router.patch('/timetable/:id', verifyHODToken, [
  enumField('kind', TIMETABLE_KINDS, { optional: true }),
  enumField('day', DAYS, { optional: true }),
  optionalString('startTime', { max: 5 }),
  numberInRange('durationMinutes', { min: 15, max: 240, optional: true }),
  roomRef({ optional: true }),
  enumField('status', ['active', 'cancelled'], { optional: true }),
  validate,
], async (req, res) => {
  try {
    if (req.body.startTime !== undefined && !HHMM_REGEX.test(req.body.startTime)) {
      return res.status(400).json({ message: 'startTime must be in 24h HH:mm format.' });
    }
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const slot = await TimetableSlot.findOne({ _id: req.params.id, departmentId: hod.departmentId });
    if (!slot) return res.status(404).json({ message: 'Slot not found or access denied.' });
    const before = slot.toObject();

    const room = req.resolvedRefs?.room || null;
    if (room && room.departmentId && String(room.departmentId) !== String(hod.departmentId)) {
      return res.status(400).json({ message: 'This room does not belong to your department.' });
    }

    const kind = req.body.kind !== undefined ? req.body.kind : slot.kind;
    const day = req.body.day !== undefined ? req.body.day : slot.day;
    const startTime = req.body.startTime !== undefined ? req.body.startTime : slot.startTime;
    const durationMinutes = req.body.durationMinutes !== undefined ? req.body.durationMinutes : slot.durationMinutes;
    const endTime = addMinutes(startTime, durationMinutes);

    const candidate = {
      ...before, kind, day, startTime, endTime, durationMinutes,
      roomId: room ? room._id : slot.roomId,
      room: room ? (room.code ? `${room.code} — ${room.name}` : room.name) : slot.room,
    };
    const conflicts = await findClashes(candidate, { excludeSlotId: slot._id });
    if (conflicts.length) return res.status(409).json({ message: 'This slot conflicts with an existing booking.', conflicts });

    slot.kind = kind; slot.day = day; slot.startTime = startTime; slot.endTime = endTime; slot.durationMinutes = durationMinutes;
    if (room) { slot.roomId = candidate.roomId; slot.room = candidate.room; }
    if (req.body.status !== undefined) slot.status = req.body.status;
    await slot.save();

    let warnings = [];
    if (slot.status === 'active') {
      const [deptSetting, roomDoc, sectionStudentCount] = await Promise.all([
        DeptSetting.getOrDefault(slot.departmentId, slot.sessionId),
        Room.findById(slot.roomId),
        Student.countDocuments({ programId: slot.programId, currentSemester: slot.semesterNumber, timeSession: slot.timeSession, status: 'approved' }),
      ]);
      warnings = await findWarnings(slot.toObject(), { deptSetting, room: roomDoc, sectionStudentCount });
    }

    await logAudit(req, {
      action: 'timetableSlot.update', entityType: 'TimetableSlot', entityId: slot._id,
      entityLabel: `${slot.subject} — ${slot.day} ${slot.startTime}`, before, after: slot.toObject(),
    });
    res.json({ slot, warnings });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/hod/timetable/:id
router.delete('/timetable/:id', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const slot = await TimetableSlot.findOneAndDelete({ _id: req.params.id, departmentId: hod.departmentId });
    if (!slot) return res.status(404).json({ message: 'Slot not found or access denied.' });
    await logAudit(req, {
      action: 'timetableSlot.delete', entityType: 'TimetableSlot', entityId: slot._id,
      entityLabel: `${slot.subject} — ${slot.day} ${slot.startTime}`, before: slot.toObject(),
    });
    res.json({ message: 'Slot deleted.' });
  } catch (err) { res.sendServerError(err); }
});

// ── Timetable print/export ──────────────────────────────────────────────────
const TIMETABLE_EXPORT_GRANULARITY = 30; // minutes per grid row
const XLSX_THIN_BORDER = { style: 'thin' };
const XLSX_ALL_BORDERS = { top: XLSX_THIN_BORDER, left: XLSX_THIN_BORDER, bottom: XLSX_THIN_BORDER, right: XLSX_THIN_BORDER };

function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function toHHMM(mins) { return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`; }

// Builds one worksheet as a days x time grid for a single section's slots,
// merging a session's cell vertically across as many 30-minute rows as its
// duration spans (e.g. a 90-minute session merges 3 rows).
function writeTimetableSheet(sheet, slots, title, subtitle) {
  sheet.columns = [{ width: 12 }, ...DAYS.map(() => ({ width: 26 }))];

  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, DAYS.length + 1);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  titleRow.getCell(1).alignment = { horizontal: 'center' };

  const subtitleRow = sheet.addRow([subtitle]);
  sheet.mergeCells(2, 1, 2, DAYS.length + 1);
  subtitleRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF666666' } };
  subtitleRow.getCell(1).alignment = { horizontal: 'center' };

  const headerRowNum = 3;
  const headerRow = sheet.getRow(headerRowNum);
  headerRow.getCell(1).value = 'Time';
  DAYS.forEach((d, i) => { headerRow.getCell(i + 2).value = d; });
  headerRow.eachCell((c) => {
    c.font = { bold: true }; c.alignment = { horizontal: 'center' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7C6D9' } }; c.border = XLSX_ALL_BORDERS;
  });

  if (!slots.length) {
    sheet.getRow(headerRowNum + 1).getCell(1).value = 'No sessions scheduled.';
    return;
  }

  let minStart = Math.min(...slots.map((s) => toMinutes(s.startTime)));
  let maxEnd = Math.max(...slots.map((s) => toMinutes(s.endTime)));
  minStart = Math.floor(minStart / TIMETABLE_EXPORT_GRANULARITY) * TIMETABLE_EXPORT_GRANULARITY;
  maxEnd = Math.ceil(maxEnd / TIMETABLE_EXPORT_GRANULARITY) * TIMETABLE_EXPORT_GRANULARITY;

  const rowCount = Math.max(1, Math.round((maxEnd - minStart) / TIMETABLE_EXPORT_GRANULARITY));
  for (let i = 0; i < rowCount; i++) {
    const row = sheet.getRow(headerRowNum + 1 + i);
    row.getCell(1).value = toHHMM(minStart + i * TIMETABLE_EXPORT_GRANULARITY);
    row.getCell(1).font = { bold: true, size: 9 };
    row.getCell(1).border = XLSX_ALL_BORDERS;
    for (let d = 0; d < DAYS.length; d++) row.getCell(d + 2).border = XLSX_ALL_BORDERS;
  }

  slots.forEach((s) => {
    const dayIndex = DAYS.indexOf(s.day);
    if (dayIndex === -1) return;
    const startRowIdx = Math.max(0, Math.round((toMinutes(s.startTime) - minStart) / TIMETABLE_EXPORT_GRANULARITY));
    const span = Math.max(1, Math.round(s.durationMinutes / TIMETABLE_EXPORT_GRANULARITY));
    const startRow = headerRowNum + 1 + startRowIdx;
    const endRow = Math.min(startRow + span - 1, headerRowNum + rowCount);
    const col = dayIndex + 2;
    const cell = sheet.getCell(startRow, col);
    cell.value = `${s.subject}${s.kind === 'lab' ? ' (Lab)' : ''}\n${s.teacherName}\n${s.room}`;
    cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    cell.font = { size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: s.kind === 'lab' ? 'FFDCEFFB' : 'FFE8F5E9' } };
    if (endRow > startRow) sheet.mergeCells(startRow, col, endRow, col);
  });
}

// GET /api/portal/hod/timetable/export.xlsx?sessionId=&programId=&semesterNumber=&timeSession=
router.get('/timetable/export.xlsx', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('department departmentId');
    const f = { departmentId: hod.departmentId, status: 'active' };
    const { sessionId, programId, semesterNumber, timeSession } = req.query;
    if (sessionId) f.sessionId = sessionId;
    if (programId) f.programId = programId;
    if (semesterNumber) f.semesterNumber = Number(semesterNumber);
    if (timeSession) f.timeSession = timeSession;
    const slots = await TimetableSlot.find(f).sort({ day: 1, startTime: 1 });

    const workbook = new ExcelJS.Workbook();
    const bySection = new Map();
    slots.forEach((s) => {
      if (!bySection.has(s.sectionKey)) bySection.set(s.sectionKey, { label: `${s.program || 'Program'} — Sem ${s.semesterNumber} (${s.timeSession})`, slots: [] });
      bySection.get(s.sectionKey).slots.push(s);
    });

    if (bySection.size === 0) {
      writeTimetableSheet(workbook.addWorksheet('Timetable'), [], `Timetable — ${hod.department}`, `Generated on ${new Date().toLocaleDateString('en-GB')}`);
    } else {
      const usedNames = new Set();
      for (const { label, slots: sectionSlots } of bySection.values()) {
        let name = label.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Section';
        let n = 2;
        while (usedNames.has(name)) { name = `${name.slice(0, 28)} (${n++})`; }
        usedNames.add(name);
        writeTimetableSheet(workbook.addWorksheet(name), sectionSlots, label, `Department of ${hod.department} — Generated on ${new Date().toLocaleDateString('en-GB')}`);
      }
    }

    const safeDept = (hod.department || 'Timetable').replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Timetable_${safeDept}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { res.sendServerError(err); }
});

// ── Department-wide attendance browser ─────────────────────────────────────
// GET /api/portal/hod/attendance?courseId=&teacherId=&programId=&semesterNumber=&timeSession=&date=&dateFrom=&dateTo=
router.get('/attendance', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const classFilter = { departmentId: hod.departmentId, status: 'active' };
    const { courseId, teacherId, programId, semesterNumber, timeSession } = req.query;
    if (courseId && mongoose.isValidObjectId(courseId)) classFilter._id = courseId;
    if (teacherId && mongoose.isValidObjectId(teacherId)) classFilter.teacher = teacherId;
    if (programId && mongoose.isValidObjectId(programId)) classFilter.programId = programId;
    if (timeSession) classFilter.timeSession = timeSession;

    let classes = await OngoingClass.find(classFilter);
    if (semesterNumber) classes = classes.filter((c) => parseSemesterNumber(c.semester) === Number(semesterNumber));
    const classIds = classes.map((c) => c._id);
    if (!classIds.length) return res.json([]);

    const sessionFilter = { ongoingClassId: { $in: classIds } };
    const { date, dateFrom, dateTo } = req.query;
    if (date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid date.' });
      d.setUTCHours(0, 0, 0, 0);
      sessionFilter.date = d;
    } else if (dateFrom || dateTo) {
      sessionFilter.date = {};
      if (dateFrom) sessionFilter.date.$gte = new Date(dateFrom);
      if (dateTo) sessionFilter.date.$lte = new Date(dateTo);
    }

    const sessions = await Attendance.find(sessionFilter).sort({ date: -1 });
    res.json(sessions);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/attendance/unmarked?date=YYYY-MM-DD — timetable slots
// whose weekly occurrence on this date has no matching Attendance document
// yet (defaults to today).
router.get('/attendance/unmarked', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid date.' });

    const JS_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = JS_DAY_NAMES[d.getUTCDay()];
    if (!DAYS.includes(dayName)) return res.json({ date: dateStr, day: dayName, unmarked: [] });

    const slots = await TimetableSlot.find({ departmentId: hod.departmentId, day: dayName, status: 'active' });
    const dayStart = new Date(dateStr); dayStart.setUTCHours(0, 0, 0, 0);
    const attendanceDocs = await Attendance.find({
      ongoingClassId: { $in: slots.map((s) => s.ongoingClass) }, date: dayStart, isMakeup: false,
    }).select('ongoingClassId');
    const markedSet = new Set(attendanceDocs.map((a) => String(a.ongoingClassId)));

    const unmarked = slots
      .filter((s) => !markedSet.has(String(s.ongoingClass)))
      .map((s) => ({
        ongoingClassId: s.ongoingClass, subject: s.subject, teacherName: s.teacherName,
        room: s.room, startTime: s.startTime, endTime: s.endTime, kind: s.kind,
      }));
    res.json({ date: dateStr, day: dayName, unmarked });
  } catch (err) { res.sendServerError(err); }
});

// ── Curriculum & Accreditation ──────────────────────────────────────────────
// GET /api/portal/hod/curriculum?programId= — program -> semester -> course
// map with credit-hour totals, theory/lab split, and a deviation flag when a
// semester's total credit hours strays far from the program's own average
// (the "expected total" — computed from the program's own data, not a
// separately-configured number).
const CURRICULUM_DEVIATION_THRESHOLD = 3;

router.get('/curriculum', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId');
    const filter = { departmentId: hod.departmentId, isActive: true };
    if (req.query.programId && mongoose.isValidObjectId(req.query.programId)) filter.programId = req.query.programId;
    const courses = await Course.find(filter).sort({ semesterNumber: 1, code: 1 });

    const bySemester = new Map();
    for (let n = 1; n <= 8; n++) bySemester.set(n, []);
    courses.forEach((c) => {
      if (!bySemester.has(c.semesterNumber)) bySemester.set(c.semesterNumber, []);
      bySemester.get(c.semesterNumber).push(c);
    });

    const semesters = Array.from(bySemester.entries())
      .map(([n, list]) => ({
        semesterNumber: n, courses: list,
        totalCreditHours: list.reduce((s, c) => s + (c.creditHours || 0), 0),
        theoryCount: list.filter((c) => !c.isLab).length,
        labCount: list.filter((c) => c.isLab).length,
      }))
      .sort((a, b) => a.semesterNumber - b.semesterNumber);

    const nonEmpty = semesters.filter((s) => s.courses.length > 0);
    const expectedCreditHoursPerSemester = nonEmpty.length
      ? round2(nonEmpty.reduce((s, x) => s + x.totalCreditHours, 0) / nonEmpty.length)
      : null;
    semesters.forEach((s) => {
      s.deviates = expectedCreditHoursPerSemester != null && s.courses.length > 0
        && Math.abs(s.totalCreditHours - expectedCreditHoursPerSemester) > CURRICULUM_DEVIATION_THRESHOLD;
    });

    res.json({ programId: req.query.programId || null, semesters, expectedCreditHoursPerSemester });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/hod/curriculum/export.xlsx?programId=
router.get('/curriculum/export.xlsx', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId department');
    const filter = { departmentId: hod.departmentId, isActive: true };
    if (req.query.programId && mongoose.isValidObjectId(req.query.programId)) filter.programId = req.query.programId;
    const courses = await Course.find(filter).sort({ semesterNumber: 1, code: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Curriculum');
    writeReportSheet(sheet, [
      { header: 'Semester', key: 'semesterNumber', width: 10 },
      { header: 'Code', key: 'code', width: 14 },
      { header: 'Title', key: 'title', width: 34 },
      { header: 'Credit Hours', key: 'creditHours', width: 14 },
      { header: 'Type', key: 'type', width: 12 },
    ], courses.map((c) => ({
      semesterNumber: c.semesterNumber, code: c.code, title: c.title,
      creditHours: c.creditHours, type: c.isLab ? 'Lab' : 'Theory',
    })));

    const safeDept = (hod.department || 'Curriculum').replace(/[^a-z0-9]+/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Curriculum_${safeDept}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { res.sendServerError(err); }
});

// ── Notices & Calendar ───────────────────────────────────────────────────────
// GET /api/portal/hod/calendar?month=YYYY-MM — exam dates (DateSheet),
// semester start/end (Semester), notices, and make-up classes overlaid on
// one month view.
router.get('/calendar', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId department');
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const data = await getCalendarEvents({ departmentId: hod.departmentId, department: hod.department, month });
    res.json(data);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── Reports (6.2) ────────────────────────────────────────────────────────────
// GET /api/portal/hod/reports/monthly?month=YYYY-MM&programId=&semesterNumber=&format=xlsx
router.get('/reports/monthly', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId department');
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const { programId, semesterNumber } = req.query;
    const report = await getMonthlyReport({
      departmentId: hod.departmentId, department: hod.department, month,
      programId: (programId && mongoose.isValidObjectId(programId)) ? programId : undefined,
      semesterNumber: semesterNumber ? Number(semesterNumber) : undefined,
    });

    if (req.query.format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Monthly Report');
      writeReportSheet(sheet, [
        { header: 'Course', key: 'subject', width: 28 }, { header: 'Code', key: 'courseCode', width: 12 },
        { header: 'Teacher', key: 'teacherName', width: 22 }, { header: 'Required', key: 'sessionsRequired', width: 10 },
        { header: 'Held', key: 'sessionsHeld', width: 8 }, { header: 'Make-up', key: 'makeupSessions', width: 10 },
        { header: 'Unmarked', key: 'unmarkedSessions', width: 10 }, { header: 'Avg Attendance %', key: 'averageAttendance', width: 16 },
        { header: 'Defaulters', key: 'defaultersCount', width: 10 }, { header: 'Pending Result Sheets', key: 'pendingResultSheets', width: 20 },
      ], report.courses);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Monthly_Report_${month}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }
    res.json(report);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/portal/hod/reports/semester?sessionId=&semesterNumber=&format=xlsx
router.get('/reports/semester', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId department');
    const { sessionId, semesterNumber } = req.query;
    const semNum = Number(semesterNumber);
    if (!mongoose.isValidObjectId(sessionId) || !Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
      return res.status(400).json({ message: 'sessionId and a valid semesterNumber (1-8) are required.' });
    }
    const report = await getSemesterReport({ departmentId: hod.departmentId, department: hod.department, sessionId, semesterNumber: semNum });

    if (req.query.format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const s1 = workbook.addWorksheet('Course Averages');
      writeReportSheet(s1, [
        { header: 'Subject', key: 'subject', width: 28 }, { header: 'Teacher', key: 'teacherName', width: 22 },
        { header: 'Students', key: 'studentCount', width: 10 }, { header: 'Avg Marks %', key: 'averageMarksPercent', width: 14 },
        { header: 'Avg Attendance %', key: 'averageAttendance', width: 16 },
      ], report.courseAverages);
      const s2 = workbook.addWorksheet('Trend');
      writeReportSheet(s2, [
        { header: 'Session', key: 'session', width: 16 }, { header: 'Avg Attendance %', key: 'averageAttendance', width: 16 },
        { header: 'Pass Rate %', key: 'passRate', width: 14 },
      ], report.trend);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Semester_Report_${semNum}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }
    res.json(report);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// GET /api/portal/hod/reports/exam-eligibility?sessionId=&semesterNumber=&examType=&format=xlsx
// The operative report — every student x course with attendance %,
// eligible/borderline/not-eligible against minAttendancePercent, the
// shortfall (in sessions) needed to reach the threshold, and a flag for any
// pending correction request that could still change the verdict.
router.get('/reports/exam-eligibility', verifyHODToken, async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id).select('departmentId department');
    const { sessionId, semesterNumber, examType } = req.query;
    const semNum = Number(semesterNumber);
    if (!mongoose.isValidObjectId(sessionId) || !Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
      return res.status(400).json({ message: 'sessionId and a valid semesterNumber (1-8) are required.' });
    }
    const report = await getExamEligibility({
      departmentId: hod.departmentId, department: hod.department, sessionId, semesterNumber: semNum, examType,
    });

    if (req.query.format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Exam Eligibility');
      writeReportSheet(sheet, [
        { header: 'Reg No', key: 'registrationNo', width: 16 }, { header: 'Name', key: 'studentName', width: 22 },
        { header: 'Course', key: 'subject', width: 26 }, { header: 'Attended', key: 'attended', width: 10 },
        { header: 'Total', key: 'total', width: 8 }, { header: 'Attendance %', key: 'attendancePercent', width: 14 },
        { header: 'Status', key: 'status', width: 14 }, { header: 'Shortfall Sessions', key: 'shortfallSessions', width: 18 },
        { header: 'Pending Correction', key: 'pendingCorrection', width: 18 },
      ], report.rows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Exam_Eligibility_Sem${semNum}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    }
    res.json(report);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── Profile — password change ───────────────────────────────────────────────
// PATCH /api/portal/hod/profile/password
router.patch('/profile/password', verifyHODToken, [
  requiredString('currentPassword', { min: 1, max: 200 }),
  passwordField('newPassword'),
  validate,
], async (req, res) => {
  try {
    const hod = await HOD.findById(req.user.id);
    if (!hod) return res.status(404).json({ message: 'HOD not found.' });
    const valid = await bcrypt.compare(req.body.currentPassword, hod.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    hod.password = await bcrypt.hash(req.body.newPassword, 10);
    hod.tokenVersion = (hod.tokenVersion || 0) + 1;
    await hod.save();
    await logAudit(req, { action: 'hod.passwordChange', entityType: 'HOD', entityId: hod._id, entityLabel: hod.fullName });

    // tokenVersion just changed, so the token the request came in on is now
    // stale — issue a fresh one so the HOD isn't logged out by their own
    // password change.
    const token = jwt.sign(
      { id: hod._id, role: 'hod', hodId: hod.hodId, department: hod.department, tokenVersion: hod.tokenVersion },
      process.env.JWT_SECRET, { expiresIn: '12h' },
    );
    res.json({ message: 'Password changed.', token });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

module.exports = router;
