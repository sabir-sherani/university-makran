const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const DateSheet = require('../models/DateSheet');
const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const CorrectionRequest = require('../models/CorrectionRequest');
const crypto = require('crypto');
const { verifyStudentToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');
const {
  registrationNo, cnic, phone, personName, dateOfBirth, email, password: passwordChain,
  enumField, requiredString, optionalString, validate, enums,
  departmentRef, programRef, sessionRef, snapshotRefs,
} = require('../validators');
const { escapeRegex } = require('../utils/escapeRegex');
const { isDuplicateKeyError, duplicateKeyMessage } = require('../utils/duplicateKey');
const { authLimiter } = require('../middleware/rateLimiters');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');

const REGISTER_ALLOWED_FIELDS = [
  'registrationNo', 'fullName', 'email', 'password', 'phone', 'cnic', 'fatherName',
  'gender', 'dateOfBirth', 'address', 'timeSession', 'rollNo',
];

// POST /api/portal/student/register
router.post('/register', authLimiter, [
  registrationNo('registrationNo'),
  personName('fullName'),
  email('email'),
  passwordChain('password'),
  phone('phone'),
  cnic('cnic'),
  personName('fatherName'),
  enumField('gender', enums.GENDER),
  dateOfBirth('dateOfBirth'),
  optionalString('address', { max: 300 }),
  departmentRef({ optional: false }),
  programRef({ optional: false }),
  sessionRef({ optional: false }),
  enumField('timeSession', enums.TIME_SESSION),
  optionalString('rollNo', { max: 30 }),
  validate,
], async (req, res) => {
  try {
    const data = {};
    REGISTER_ALLOWED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    });
    snapshotRefs(req, data);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const student = new Student({ ...data, password: hashedPassword, status: 'pending' });
    await student.save();
    res.status(201).json({ message: 'Registration submitted. Pending admin approval.' });
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(400).json({ message: duplicateKeyMessage(error) });
    res.status(400).json({ message: error.message });
  }
});

// POST /api/portal/student/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const registrationNo = String(req.body.registrationNo || '').trim().toUpperCase();
    const student = await Student.findOne({ registrationNo });
    if (!student) return res.status(401).json({ message: 'Invalid credentials.' });

    if (student.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact admin.' });

    if (isLocked(student)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(student)} minute(s).` });
    }

    const valid = await bcrypt.compare(password, student.password);
    if (!valid) {
      await recordFailedAttempt(student);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    await resetFailedAttempts(student);

    if (student.status === 'pending') return res.status(403).json({ message: 'Your account is pending admin approval.' });
    if (student.status === 'rejected') return res.status(403).json({ message: 'Your registration has been rejected.' });
    if (student.status === 'suspended') return res.status(403).json({ message: 'Your account has been suspended. Contact admin.' });

    const token = jwt.sign(
      { id: student._id, role: 'student', registrationNo: student.registrationNo, tokenVersion: student.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    const studentData = student.toObject();
    delete studentData.password;
    res.json({ token, student: studentData });
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/student/profile
router.get('/profile', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (error) {
    res.sendServerError(error);
  }
});

// Fields a student may only change by requesting admin-reviewed approval
// once their account is approved — these are the "official record" fields.
const PROFILE_CORRECTION_FIELDS = ['fullName', 'cnic', 'dateOfBirth', 'email'];
// Freely self-editable at any time.
const PROFILE_DIRECT_FIELDS = ['phone', 'address'];
// Editable before approval (when the record hasn't been certified yet), but
// frozen — neither directly editable nor correction-request-eligible — once
// approved. Not named in the correction-request field list above.
const PROFILE_PRE_APPROVAL_ONLY_FIELDS = ['fatherName', 'gender', 'timeSession', 'rollNo'];

// PATCH /api/portal/student/profile
router.patch('/profile', verifyStudentToken, [
  personName('fullName', { optional: true }),
  email('email', { optional: true }),
  phone('phone', { optional: true }),
  cnic('cnic', { optional: true }),
  personName('fatherName', { optional: true }),
  enumField('gender', enums.GENDER, { optional: true }),
  dateOfBirth('dateOfBirth', { optional: true }),
  optionalString('address', { max: 300 }),
  enumField('timeSession', enums.TIME_SESSION, { optional: true }),
  optionalString('rollNo', { max: 30 }),
  validate,
], async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const isApproved = student.status === 'approved';

    const directUpdates = {};
    PROFILE_DIRECT_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) directUpdates[field] = req.body[field];
    });

    const skippedFields = [];
    if (!isApproved) {
      // Not yet certified by admin — the student can still freely correct
      // these while the registration is under review.
      [...PROFILE_CORRECTION_FIELDS, ...PROFILE_PRE_APPROVAL_ONLY_FIELDS].forEach((field) => {
        if (req.body[field] !== undefined) directUpdates[field] = req.body[field];
      });
    } else {
      PROFILE_PRE_APPROVAL_ONLY_FIELDS.forEach((field) => {
        if (req.body[field] !== undefined) skippedFields.push(field);
      });
    }

    let correctionRequested = false;
    if (isApproved) {
      const proposedChanges = PROFILE_CORRECTION_FIELDS
        .filter((field) => req.body[field] !== undefined && String(req.body[field]) !== String(student[field] ?? ''))
        .map((field) => ({ field, oldValue: String(student[field] ?? ''), newValue: String(req.body[field]) }));

      if (proposedChanges.length) {
        await CorrectionRequest.create({
          type: 'student-profile',
          student: student._id,
          studentRegistrationNo: student.registrationNo,
          studentName: student.fullName,
          department: student.department,
          reason: 'Student-requested correction to official profile fields.',
          requestedFieldChanges: proposedChanges,
          status: 'pending',
        });
        correctionRequested = true;
      }
    }

    let updatedStudent = student;
    if (Object.keys(directUpdates).length) {
      updatedStudent = await Student.findByIdAndUpdate(
        req.user.id, { $set: directUpdates }, { new: true, runValidators: true }
      ).select('-password');
    } else {
      updatedStudent = await Student.findById(req.user.id).select('-password');
    }

    const messages = [];
    if (Object.keys(directUpdates).length) messages.push('Profile updated successfully.');
    if (correctionRequested) messages.push('Your requested changes to fullName/cnic/dateOfBirth/email have been submitted for admin approval.');
    if (skippedFields.length) messages.push(`These fields can no longer be self-edited once approved and were not changed: ${skippedFields.join(', ')}.`);
    if (!messages.length) messages.push('No changes submitted.');

    res.json({ message: messages.join(' '), student: updatedStudent, correctionRequested });
  } catch (error) {
    if (isDuplicateKeyError(error)) return res.status(400).json({ message: duplicateKeyMessage(error) });
    res.status(400).json({ message: error.message });
  }
});

// GET /api/portal/student/correction-requests — this student's own
// profile-correction requests, so they can see whether admin approved,
// rejected (with reason), or is still reviewing a submitted change.
router.get('/correction-requests', verifyStudentToken, async (req, res) => {
  try {
    const requests = await CorrectionRequest.find({ student: req.user.id, type: 'student-profile' })
      .select('-reviewedBy')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.sendServerError(err); }
});

// Builds an $or clause matching a doc whose <idField>/<strField> pair either
// (a) is blank/unset — treated as "applies to everyone", (b) has an official
// id equal to the student's, or (c) — only for legacy docs with no id set —
// has a string that exactly (case-insensitively) equals the student's string.
// Every interpolated value is regex-escaped, and the string fallback never
// matches a doc that DOES carry an id (so a stale/mismatched string can't
// override the authoritative id).
function officialFieldMatch(idField, strField, studentIdVal, studentStrVal) {
  const or = [{ [strField]: '' }, { [strField]: null }, { [strField]: { $exists: false } }];
  if (studentIdVal) or.push({ [idField]: studentIdVal });
  if (studentStrVal) {
    or.push({
      [idField]: { $exists: false },
      [strField]: { $regex: `^${escapeRegex(studentStrVal)}$`, $options: 'i' },
    });
  }
  return { $or: or };
}

// GET /api/portal/student/datesheets
router.get('/datesheets', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const semesterLabel = `Semester ${student.currentSemester}`;
    const datesheets = await DateSheet.find({
      isPublished: true,
      $and: [
        officialFieldMatch('departmentId', 'department', student.departmentId, student.department),
        officialFieldMatch('programId', 'program', student.programId, student.program),
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).sort({ createdAt: -1 });
    res.json(datesheets);
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/student/results
router.get('/results', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const semesterLabel = `Semester ${student.currentSemester}`;
    const results = await Result.find({
      isPublished: true,
      $and: [
        officialFieldMatch('departmentId', 'department', student.departmentId, student.department),
        officialFieldMatch('programId', 'program', student.programId, student.program),
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.sendServerError(error);
  }
});

// GET /api/portal/student/assignments
router.get('/assignments', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const semesterLabel = `Semester ${student.currentSemester}`;
    const assignments = await Assignment.find({
      isPublished: true,
      $and: [
        officialFieldMatch('departmentId', 'department', student.departmentId, student.department),
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).sort({ createdAt: -1 });

    const mySubmissions = await AssignmentSubmission.find({ studentId: req.user.id });
    const submittedMap = Object.fromEntries(mySubmissions.map(s => [s.assignmentId.toString(), s]));

    const enriched = assignments.map(a => ({
      ...a.toObject(),
      mySubmission: submittedMap[a._id.toString()] || null,
    }));
    res.json(enriched);
  } catch (error) {
    res.sendServerError(error);
  }
});

// POST /api/portal/student/assignments/:id/submit
const { createUpload } = require('../utils/cloudinary');
const submissionUpload = createUpload('portal/student');

router.post('/assignments/:id/submit', verifyStudentToken, submissionUpload.single('file'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    const { note } = req.body;
    const existing = await AssignmentSubmission.findOne({ assignmentId: req.params.id, studentId: req.user.id });

    if (existing) {
      if (note !== undefined) existing.note = note;
      if (req.file) {
        existing.fileUrl = req.file.path;
        existing.fileName = req.file.originalname;
      }
      await existing.save();
      return res.json({ message: 'Submission updated successfully.', submission: existing });
    }

    const submission = new AssignmentSubmission({
      assignmentId: req.params.id,
      studentId: req.user.id,
      registrationNo: student.registrationNo,
      studentName: student.fullName,
      note: note || '',
      fileUrl: req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
    });
    await submission.save();
    res.status(201).json({ message: 'Assignment submitted successfully.', submission });
  } catch (error) {
    res.sendServerError(error);
  }
});

// ─── Result Sheets (student's own entries) ────────────────────────────────────
const ResultSheet = require('../models/ResultSheet');
const { buildAcademicSummary } = require('../utils/academicSummary');

// GET /api/portal/student/result-sheets
// Returns every finalized result sheet entry belonging to this student, with
// grade/gradePoints/percentage/creditHours computed server-side (see
// utils/grading.js) — the client only renders these, it never computes a
// grade or GPA itself. Also includes the student's overall CGPA and their
// current semester's GPA for the result-card header.
router.get('/result-sheets', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('registrationNo programId currentSemester');
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const { entries, cgpa, currentSemesterGPA } = await buildAcademicSummary(student);
    const results = entries.map((e) => ({ ...e, status: 'finalized' }));

    res.json({ results, cgpa, currentSemesterGPA });
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/student/transcript
// Full academic transcript: finalized results grouped by semester, each
// with a credit-hour-weighted semester GPA, plus the overall CGPA — all
// computed server-side so the transcript printout can't be tampered with
// client-side.
router.get('/transcript', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('registrationNo programId currentSemester');
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const { bySemester, cgpa, totalCreditHours } = await buildAcademicSummary(student);
    res.json({ bySemester, cgpa, totalCreditHours });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ─── Fee Challans (student's own) ────────────────────────────────────────────
const FeeChallan = require('../models/FeeChallan');

router.get('/challans', verifyStudentToken, async (req, res) => {
  try {
    const challans = await FeeChallan.find({ student: req.user.id }).sort({ createdAt: -1 });
    res.json(challans);
  } catch (err) { res.sendServerError(err); }
});

router.get('/challans/:id', verifyStudentToken, async (req, res) => {
  try {
    const challan = await FeeChallan.findOne({ _id: req.params.id, student: req.user.id });
    if (!challan) return res.status(404).json({ message: 'Challan not found.' });
    res.json(challan);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/student/ongoing-classes
// Only shows classes that match the student's department, current semester, session (batch), and time session
const OngoingClass = require('../models/OngoingClass');
router.get('/ongoing-classes', verifyStudentToken, async (req, res) => {
  try {
    const student = await require('../models/Student')
      .findById(req.user.id)
      .select('department departmentId program programId currentSemester session sessionId timeSession');

    const f = { status: 'active' };
    const and = [];

    // Match department: prefer the official id; fall back to an exact
    // (escaped) string match only for legacy classes with no departmentId.
    if (student?.departmentId) {
      and.push({ $or: [{ departmentId: student.departmentId }, {
        departmentId: { $exists: false },
        department: { $regex: `^${escapeRegex(student.department || '')}$`, $options: 'i' },
      }] });
    } else if (student?.department) {
      and.push({ departmentId: { $exists: false }, department: { $regex: `^${escapeRegex(student.department)}$`, $options: 'i' } });
    }

    // Match semester: student.currentSemester is a Number (e.g. 1),
    // OngoingClass.semester is a String (e.g. "Semester 1" or "1").
    // Use word-boundary regex so "1" matches "Semester 1" but not "11" or "12".
    if (student?.currentSemester) {
      and.push({ semester: { $regex: `\\b${escapeRegex(String(student.currentSemester))}\\b`, $options: 'i' } });
    }

    // Match academic session (student batch year e.g. "2025-2029")
    if (student?.sessionId) {
      and.push({ $or: [{ sessionId: student.sessionId }, {
        sessionId: { $exists: false },
        academicSession: { $regex: `^${escapeRegex(student.session || '')}$`, $options: 'i' },
      }] });
    } else if (student?.session) {
      and.push({ sessionId: { $exists: false }, academicSession: { $regex: `^${escapeRegex(student.session)}$`, $options: 'i' } });
    }

    // Match time session (Morning / Evening)
    if (student?.timeSession) {
      f.timeSession = student.timeSession;
    }

    if (and.length) f.$and = and;

    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/student/dept-notices — notices from student's own department
const DeptNotice = require('../models/DeptNotice');

// Notices are visible to a student only when: isPublished, now is within
// [publishAt, expiresAt], the department matches (audience.departments if
// set, else the legacy department string), and — if the notice narrows
// further — the student's program/semester/role are included. An empty
// audience.programs/semesters/roles array means "no restriction".
function buildNoticeAudienceFilter(student) {
  const now = new Date();
  const departmentOr = [
    { $and: [{ 'audience.departments.0': { $exists: true } }, { 'audience.departments': student.departmentId }] },
    { $and: [
      { $or: [{ 'audience.departments': { $exists: false } }, { 'audience.departments': { $size: 0 } }] },
      { department: { $regex: `^${escapeRegex(student.department || '')}$`, $options: 'i' } },
    ] },
  ];
  return {
    isPublished: true,
    $and: [
      { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }] },
      { $or: departmentOr },
      { $or: [{ 'audience.programs': { $exists: false } }, { 'audience.programs': { $size: 0 } }, { 'audience.programs': student.programId }] },
      { $or: [{ 'audience.semesters': { $exists: false } }, { 'audience.semesters': { $size: 0 } }, { 'audience.semesters': student.currentSemester }] },
      { $or: [{ 'audience.roles': { $exists: false } }, { 'audience.roles': { $size: 0 } }, { 'audience.roles': 'all' }, { 'audience.roles': 'student' }] },
    ],
  };
}

router.get('/dept-notices', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('department departmentId programId currentSemester');
    const notices = await DeptNotice.find(buildNoticeAudienceFilter(student)).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) { res.sendServerError(err); }
});

// ─── Dashboard summary ────────────────────────────────────────────────────
const Attendance = require('../models/Attendance');
const SemesterCourse = require('../models/SemesterCourse');

// GET /api/portal/student/dashboard — everything the portal landing page
// needs in one call. Every derived number here (attendance %, GPA/CGPA,
// outstanding balance, counts) is computed server-side from the underlying
// records, never from the legacy Student.cgpa/attendancePercentage fields
// (those are admin-editable and can drift from reality).
router.get('/dashboard', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const now = new Date();
    const semesterLabel = `Semester ${student.currentSemester}`;

    // Classes the student is currently enrolled in — same id-first,
    // string-fallback matching used by GET /ongoing-classes.
    const classFilter = { status: 'active' };
    const classAnd = [];
    if (student.departmentId) {
      classAnd.push({ $or: [{ departmentId: student.departmentId }, {
        departmentId: { $exists: false },
        department: { $regex: `^${escapeRegex(student.department || '')}$`, $options: 'i' },
      }] });
    } else if (student.department) {
      classAnd.push({ departmentId: { $exists: false }, department: { $regex: `^${escapeRegex(student.department)}$`, $options: 'i' } });
    }
    if (student.currentSemester) {
      classAnd.push({ semester: { $regex: `\\b${escapeRegex(String(student.currentSemester))}\\b`, $options: 'i' } });
    }
    if (student.sessionId) {
      classAnd.push({ $or: [{ sessionId: student.sessionId }, {
        sessionId: { $exists: false },
        academicSession: { $regex: `^${escapeRegex(student.session || '')}$`, $options: 'i' },
      }] });
    } else if (student.session) {
      classAnd.push({ sessionId: { $exists: false }, academicSession: { $regex: `^${escapeRegex(student.session)}$`, $options: 'i' } });
    }
    if (student.timeSession) classFilter.timeSession = student.timeSession;
    if (classAnd.length) classFilter.$and = classAnd;

    const myClasses = await OngoingClass.find(classFilter).select('_id');
    const classIds = myClasses.map((c) => c._id);

    // Attendance % from actual session records for those classes — Present
    // and Late both count as attended, matching the definition teachers
    // already see in their own per-class attendance report.
    let attendancePercentage = null;
    if (classIds.length) {
      const sessions = await Attendance.find({ ongoingClassId: { $in: classIds } }).select('records');
      let attended = 0, total = 0;
      sessions.forEach((s) => {
        const rec = s.records.find((r) => r.registrationNo === student.registrationNo);
        if (!rec) return;
        total += 1;
        if (rec.status === 'Present' || rec.status === 'Late') attended += 1;
      });
      attendancePercentage = total > 0 ? Math.round((attended / total) * 100) : null;
    }

    // Current-semester GPA + overall CGPA from finalized result sheets.
    const { currentSemesterGPA, cgpa } = await buildAcademicSummary(student);

    // Enrolled subjects for the current semester (program + semester lookup).
    const semesterCourseDoc = student.programId
      ? await SemesterCourse.findOne({ program: student.programId, semesterNumber: student.currentSemester })
      : null;
    const enrolledSubjects = (semesterCourseDoc?.courses || []).map((c) => ({
      courseTitle: c.courseTitle, creditHours: c.creditHours, code: c.code, theoryLab: c.theoryLab,
    }));

    // Upcoming exams — published datesheets matching the student, flattened
    // to individual schedule entries with a future date.
    const datesheets = await DateSheet.find({
      isPublished: true,
      $and: [
        officialFieldMatch('departmentId', 'department', student.departmentId, student.department),
        officialFieldMatch('programId', 'program', student.programId, student.program),
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).select('title examType examSchedule');
    const upcomingExams = datesheets
      .flatMap((ds) => (ds.examSchedule || []).map((ex) => ({
        dateSheetTitle: ds.title, examType: ds.examType, subject: ex.subject,
        date: ex.date, startTime: ex.startTime, endTime: ex.endTime, room: ex.room,
      })))
      .filter((ex) => ex.date && new Date(ex.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);

    // Pending assignments — published, matches student's dept + semester,
    // not yet submitted.
    const assignments = await Assignment.find({
      isPublished: true,
      $and: [
        officialFieldMatch('departmentId', 'department', student.departmentId, student.department),
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).select('_id');
    const submittedIds = new Set(
      (await AssignmentSubmission.find({
        studentId: req.user.id,
        assignmentId: { $in: assignments.map((a) => a._id) },
      }).select('assignmentId')).map((s) => s.assignmentId.toString())
    );
    const pendingAssignments = assignments.filter((a) => !submittedIds.has(a._id.toString())).length;

    // Active notices targeted at this student (no per-student read-tracking
    // exists yet, so this counts currently-active notices, not "unread").
    const activeNoticesCount = await DeptNotice.countDocuments(buildNoticeAudienceFilter(student));

    // Outstanding fee balance — FeeChallan has no partial-payment tracking,
    // so a challan is either fully outstanding (status: 'generated') or
    // fully paid; outstanding balance is simply the sum of unpaid challans.
    const unpaidAgg = await FeeChallan.aggregate([
      { $match: { student: student._id, status: 'generated' } },
      { $group: { _id: null, count: { $sum: 1 }, outstandingAmount: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      profile: {
        fullName: student.fullName, registrationNo: student.registrationNo, email: student.email,
        department: student.department, program: student.program, session: student.session,
        currentSemester: student.currentSemester, rollNo: student.rollNo, timeSession: student.timeSession,
        status: student.status,
      },
      attendancePercentage,
      currentSemesterGPA,
      cgpa,
      enrolledSubjects,
      upcomingExams,
      pendingAssignments,
      activeNoticesCount,
      outstandingFeeBalance: unpaidAgg[0]?.outstandingAmount || 0,
      unpaidChallanCount: unpaidAgg[0]?.count || 0,
    });
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/portal/student/forgot-password
router.post('/forgot-password', authLimiter, [email('email'), validate], async (req, res) => {
  try {
    const { email } = req.body;

    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: 'No account found with this email address. Please check and try again.' });

    const token = crypto.randomBytes(32).toString('hex');
    student.resetToken       = token;
    student.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await student.save();

    const resetLink = `${process.env.FRONTEND_URL}/portal/reset-password?token=${token}`;
    await sendPasswordResetEmail(student.email, student.fullName, resetLink);

    res.json({ message: `Password reset link sent to ${student.email}. Please check your inbox (and spam folder).` });
  } catch (err) {
    console.error('Forgot password SMTP error:', err.message);
    res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
  }
});

// POST /api/portal/student/reset-password
router.post('/reset-password', authLimiter, [
  requiredString('token', { min: 1, max: 500 }),
  passwordChain('newPassword'),
  validate,
], async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const student = await Student.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!student) return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });

    student.password         = await bcrypt.hash(newPassword, 10);
    student.resetToken       = null;
    student.resetTokenExpiry = null;
    // Changing the password invalidates every previously-issued token.
    student.tokenVersion     = (student.tokenVersion || 0) + 1;
    student.failedAttempts   = 0;
    student.lockUntil        = null;
    await student.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
