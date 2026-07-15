const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Teacher = require('../models/Teacher');
const TeacherIdSlot = require('../models/TeacherIdSlot');
const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { verifyTeacherToken } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../public/uploads/portal');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/portal/teacher/register
router.post('/register', async (req, res) => {
  try {
    const { teacherId, password, classesTaught, ...rest } = req.body;

    const slot = await TeacherIdSlot.findOne({ teacherId });
    if (!slot) return res.status(400).json({ message: 'Invalid Teacher ID. Please contact admin for a valid ID.' });
    if (slot.isUsed) return res.status(400).json({ message: 'This Teacher ID is already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const classes = typeof classesTaught === 'string'
      ? classesTaught.split(',').map(c => c.trim()).filter(Boolean)
      : classesTaught || [];

    const teacher = new Teacher({
      teacherId, ...rest, classesTaught: classes, password: hashedPassword, status: 'pending',
    });
    await teacher.save();

    slot.isUsed = true;
    slot.usedBy = rest.email;
    await slot.save();

    res.status(201).json({ message: 'Registration submitted. Pending admin approval.' });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} is already registered.` });
    }
    res.status(400).json({ message: error.message });
  }
});

// POST /api/portal/teacher/login
router.post('/login', async (req, res) => {
  try {
    const { teacherId, password } = req.body;
    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, teacher.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    if (teacher.status === 'pending') return res.status(403).json({ message: 'Your account is pending admin approval.' });
    if (teacher.status === 'rejected') return res.status(403).json({ message: 'Your account has been rejected.' });

    const token = jwt.sign(
      { id: teacher._id, role: 'teacher', teacherId: teacher.teacherId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const teacherData = teacher.toObject();
    delete teacherData.password;
    res.json({ token, teacher: teacherData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/teacher/profile
router.get('/profile', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/teacher/teaching-fields
router.get('/teaching-fields', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('teachingFields');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json(teacher.teachingFields || []);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/teacher/teaching-fields — add one field
router.post('/teaching-fields', verifyTeacherToken, async (req, res) => {
  try {
    const { subject, program, department, description } = req.body;
    if (!subject?.trim()) return res.status(400).json({ message: 'Subject name is required.' });
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    teacher.teachingFields.push({ subject: subject.trim(), program, department: department || teacher.department, description });
    await teacher.save();
    res.status(201).json({ message: 'Teaching field added.', teachingFields: teacher.teachingFields });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/teacher/attendance/:id
router.get('/attendance/:id', verifyTeacherToken, async (req, res) => {
  try {
    const session = await Attendance.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json(session);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/teacher/attendance
router.post('/attendance', verifyTeacherToken, async (req, res) => {
  try {
    const { ongoingClassId, date, records } = req.body;
    if (!ongoingClassId || !date) return res.status(400).json({ message: 'ongoingClassId and date are required.' });
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
      date: new Date(date),
      records: records || [],
    });
    await session.save();
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
    if (req.body.records) session.records = req.body.records;
    if (req.body.date)    session.date    = new Date(req.body.date);
    await session.save();
    res.json(session);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/teacher/attendance/:id
router.delete('/attendance/:id', verifyTeacherToken, async (req, res) => {
  try {
    const session = await Attendance.findOneAndDelete({ _id: req.params.id, teacher: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json({ message: 'Attendance session deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/teacher/results
router.post('/results', verifyTeacherToken, upload.single('file'), async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession, passingMarks, results } = req.body;
    const result = new Result({
      title, examType, semester, department, program, session, timeSession: timeSession || undefined,
      passingMarks: passingMarks ? Number(passingMarks) : undefined,
      uploadedBy: req.user.id,
      uploadedByRole: 'teacher',
      fileUrl: req.file ? `/uploads/portal/${req.file.filename}` : null,
      fileName: req.file ? req.file.originalname : null,
      results: results ? JSON.parse(results) : [],
    });
    await result.save();
    res.status(201).json({ message: 'Results uploaded successfully.', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/teacher/results
router.get('/results', verifyTeacherToken, async (req, res) => {
  try {
    const results = await Result.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/teacher/results/:id
router.patch('/results/:id', verifyTeacherToken, upload.single('file'), async (req, res) => {
  try {
    const result = await Result.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!result) return res.status(404).json({ message: 'Result not found or access denied.' });

    const { title, examType, semester, department, program, session, timeSession, passingMarks, results } = req.body;
    if (title) result.title = title;
    if (examType) result.examType = examType;
    if (semester !== undefined) result.semester = semester;
    if (department !== undefined) result.department = department;
    if (program !== undefined) result.program = program;
    if (session !== undefined) result.session = session;
    if (timeSession !== undefined) result.timeSession = timeSession || undefined;
    if (passingMarks !== undefined) result.passingMarks = passingMarks === '' ? undefined : Number(passingMarks);
    if (results !== undefined) result.results = JSON.parse(results);
    if (req.file) {
      result.fileUrl = `/uploads/portal/${req.file.filename}`;
      result.fileName = req.file.originalname;
    }

    await result.save();
    res.json({ message: 'Result updated successfully.', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/portal/teacher/results/:id
router.delete('/results/:id', verifyTeacherToken, async (req, res) => {
  try {
    const result = await Result.findOneAndDelete({ _id: req.params.id, uploadedBy: req.user.id });
    if (!result) return res.status(404).json({ message: 'Result not found or access denied.' });
    res.json({ message: 'Result deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      program:        cls.program        || '',
      semester:       cls.semester       || '',
      academicSession:cls.academicSession|| '',
      dueDate:        dueDate || undefined,
      totalMarks:     totalMarks ? Number(totalMarks) : 100,
      uploadedBy:     req.user.id,
      uploadedByRole: 'teacher',
      fileUrl:  req.file ? `/uploads/portal/${req.file.filename}` : null,
      fileName: req.file ? req.file.originalname : null,
    });
    await assignment.save();
    res.status(201).json({ message: 'Assignment posted successfully.', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/teacher/assignments
router.get('/assignments', verifyTeacherToken, async (req, res) => {
  try {
    const assignments = await Assignment.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      assignment.program         = cls.program         || '';
      assignment.semester        = cls.semester        || '';
      assignment.academicSession = cls.academicSession || '';
    }
    if (req.file) {
      assignment.fileUrl = `/uploads/portal/${req.file.filename}`;
      assignment.fileName = req.file.originalname;
    }
    await assignment.save();
    res.json({ message: 'Assignment updated successfully.', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    const sub = await AssignmentSubmission.findByIdAndUpdate(req.params.subId, update, { new: true });
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });
    res.json(sub);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Result Sheets & Correction Requests ─────────────────────────────────────
const ResultSheet       = require('../models/ResultSheet');
const CorrectionRequest = require('../models/CorrectionRequest');

function autoGrade(marks) {
  const m = Number(marks) || 0;
  if (m >= 90) return 'A+';
  if (m >= 80) return 'A';
  if (m >= 70) return 'B+';
  if (m >= 60) return 'B';
  if (m >= 50) return 'C';
  if (m >= 40) return 'D';
  return 'F';
}

function calcGpa(marks) {
  const m = Math.min(100, Math.max(0, Number(marks) || 0));
  return Math.round((m / 100) * 4 * 100) / 100;
}

function processEntries(entries) {
  return (entries || []).map(e => {
    const marks = Math.min(100, Math.max(0, Number(e.obtainedMarks) || 0));
    return {
      registrationNo: e.registrationNo || '',
      studentName:    e.studentName    || '',
      fatherName:     e.fatherName     || '',
      obtainedMarks:  marks,
      gpa:            calcGpa(marks),
      grade:          autoGrade(marks),
      remarks:        e.remarks || '',
      resultStatus:   'Pending',
    };
  });
}

// GET /api/portal/teacher/result-sheets
router.get('/result-sheets', verifyTeacherToken, async (req, res) => {
  try {
    const sheets = await ResultSheet.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
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

    const sheet = new ResultSheet({
      teacher: req.user.id,
      teacherId: teacher.teacherId,
      teacherName: teacher.fullName,
      ongoingClassId: oc._id,
      subject: oc.subject,
      department: oc.department,
      program: oc.program || '',
      semester: oc.semester || '',
      academicSession: oc.academicSession || '',
      examType: examType || 'Final',
      totalMarks: 100,
      entries: processEntries(entries),
      status: 'draft',
    });
    await sheet.save();
    res.status(201).json({ message: 'Result sheet saved as draft.', sheet });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/teacher/result-sheets/:id
router.get('/result-sheets/:id', verifyTeacherToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    res.json(sheet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/portal/teacher/result-sheets/:id  (draft only)
router.patch('/result-sheets/:id', verifyTeacherToken, async (req, res) => {
  try {
    const sheet = await ResultSheet.findOne({ _id: req.params.id, teacher: req.user.id });
    if (!sheet) return res.status(404).json({ message: 'Result sheet not found.' });
    if (sheet.status !== 'draft') return res.status(403).json({ message: 'Only draft result sheets can be edited.' });

    const { examType, entries } = req.body;
    if (examType !== undefined) sheet.examType = examType;
    if (entries  !== undefined) sheet.entries  = processEntries(entries);

    await sheet.save();
    res.json({ message: 'Result sheet updated.', sheet });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
    await sheet.save();
    res.json({ message: 'Result sheet submitted successfully.', sheet });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/teacher/correction-requests
router.get('/correction-requests', verifyTeacherToken, async (req, res) => {
  try {
    const requests = await CorrectionRequest.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Ongoing Classes (teacher's own) ──────────────────

// GET /api/portal/teacher/ongoing-classes
router.get('/ongoing-classes', verifyTeacherToken, async (req, res) => {
  try {
    const classes = await OngoingClass.find({ teacher: req.user.id }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/teacher/ongoing-classes
router.post('/ongoing-classes', verifyTeacherToken, async (req, res) => {
  try {
    const teacher = await require('../models/Teacher').findById(req.user.id).select('fullName teacherId');
    const cls = await new OngoingClass({
      ...req.body,
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
router.patch('/ongoing-classes/:id', verifyTeacherToken, async (req, res) => {
  try {
    const cls = await OngoingClass.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
      req.body, { new: true }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
