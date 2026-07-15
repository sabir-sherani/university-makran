const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const DateSheet = require('../models/DateSheet');
const Result = require('../models/Result');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const crypto = require('crypto');
const { verifyStudentToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');

// POST /api/portal/student/register
router.post('/register', async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new Student({ ...rest, password: hashedPassword, status: 'pending' });
    await student.save();
    res.status(201).json({ message: 'Registration submitted. Pending admin approval.' });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} is already registered.` });
    }
    res.status(400).json({ message: error.message });
  }
});

// POST /api/portal/student/login
router.post('/login', async (req, res) => {
  try {
    const { registrationNo, password } = req.body;
    const student = await Student.findOne({ registrationNo });
    if (!student) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, student.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    if (student.status === 'pending') return res.status(403).json({ message: 'Your account is pending admin approval.' });
    if (student.status === 'rejected') return res.status(403).json({ message: 'Your registration has been rejected.' });
    if (student.status === 'suspended') return res.status(403).json({ message: 'Your account has been suspended. Contact admin.' });

    const token = jwt.sign(
      { id: student._id, role: 'student', registrationNo: student.registrationNo },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const studentData = student.toObject();
    delete studentData.password;
    res.json({ token, student: studentData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/student/profile
router.get('/profile', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/student/profile
router.patch('/profile', verifyStudentToken, async (req, res) => {
  try {
    const editableFields = ['fullName', 'email', 'phone', 'cnic', 'fatherName', 'gender', 'dateOfBirth', 'address', 'timeSession', 'rollNo'];
    const updates = {};
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: 'Profile updated successfully.', student });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} is already in use by another account.` });
    }
    res.status(400).json({ message: error.message });
  }
});

// GET /api/portal/student/datesheets
router.get('/datesheets', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const semesterLabel = `Semester ${student.currentSemester}`;
    const datesheets = await DateSheet.find({
      isPublished: true,
      $or: [{ department: student.department }, { department: '' }, { department: null }, { department: { $exists: false } }],
      $and: [
        { $or: [{ program: student.program }, { program: '' }, { program: null }, { program: { $exists: false } }] },
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).sort({ createdAt: -1 });
    res.json(datesheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/student/results
router.get('/results', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const semesterLabel = `Semester ${student.currentSemester}`;
    const results = await Result.find({
      isPublished: true,
      $or: [{ department: student.department }, { department: '' }, { department: null }, { department: { $exists: false } }],
      $and: [
        { $or: [{ program: student.program }, { program: '' }, { program: null }, { program: { $exists: false } }] },
        { $or: [{ semester: semesterLabel }, { semester: '' }, { semester: null }, { semester: { $exists: false } }] },
      ],
    }).sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/student/assignments
router.get('/assignments', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    const semesterLabel = `Semester ${student.currentSemester}`;
    const assignments = await Assignment.find({
      isPublished: true,
      $or: [{ department: student.department }, { department: '' }, { department: null }, { department: { $exists: false } }],
      $and: [
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
    res.status(500).json({ message: error.message });
  }
});

// POST /api/portal/student/assignments/:id/submit
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const submissionUploadDir = path.join(__dirname, '../public/uploads/portal');
if (!fs.existsSync(submissionUploadDir)) fs.mkdirSync(submissionUploadDir, { recursive: true });
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionUploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const submissionUpload = multer({ storage: submissionStorage, limits: { fileSize: 10 * 1024 * 1024 } });

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
        existing.fileUrl = `/uploads/portal/${req.file.filename}`;
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
      fileUrl: req.file ? `/uploads/portal/${req.file.filename}` : null,
      fileName: req.file ? req.file.originalname : null,
    });
    await submission.save();
    res.status(201).json({ message: 'Assignment submitted successfully.', submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Result Sheets (student's own entries) ────────────────────────────────────
const ResultSheet = require('../models/ResultSheet');

// GET /api/portal/student/result-sheets
// Returns all submitted/finalized result sheets that contain this student's reg no
router.get('/result-sheets', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('registrationNo');
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const sheets = await ResultSheet.find({
      status: 'finalized',
      'entries.registrationNo': student.registrationNo,
    }).sort({ academicSession: -1, createdAt: -1 });

    const myResults = sheets
      .map(sheet => {
        const myEntry = sheet.entries.find(e => e.registrationNo === student.registrationNo);
        if (!myEntry) return null;
        return {
          _id: sheet._id,
          subject:         sheet.subject,
          department:      sheet.department,
          program:         sheet.program,
          semester:        sheet.semester,
          academicSession: sheet.academicSession,
          examType:        sheet.examType,
          totalMarks:      sheet.totalMarks,
          passingMarks:    sheet.passingMarks,
          status:          sheet.status,
          teacherName:     sheet.teacherName,
          teacherId:       sheet.teacherId,
          submittedAt:     sheet.submittedAt,
          createdAt:       sheet.createdAt,
          entry:           myEntry,
        };
      })
      .filter(Boolean);

    res.json(myResults);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Fee Challans (student's own) ────────────────────────────────────────────
const FeeChallan = require('../models/FeeChallan');

router.get('/challans', verifyStudentToken, async (req, res) => {
  try {
    const challans = await FeeChallan.find({ student: req.user.id }).sort({ createdAt: -1 });
    res.json(challans);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/challans/:id', verifyStudentToken, async (req, res) => {
  try {
    const challan = await FeeChallan.findOne({ _id: req.params.id, student: req.user.id });
    if (!challan) return res.status(404).json({ message: 'Challan not found.' });
    res.json(challan);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/student/ongoing-classes
// Only shows classes that match the student's department, current semester, session (batch), and time session
const OngoingClass = require('../models/OngoingClass');
router.get('/ongoing-classes', verifyStudentToken, async (req, res) => {
  try {
    const student = await require('../models/Student')
      .findById(req.user.id)
      .select('department program currentSemester session timeSession');

    const f = { status: 'active' };

    // Match department
    if (student?.department) {
      f.department = { $regex: student.department, $options: 'i' };
    }

    // Match semester: student.currentSemester is a Number (e.g. 1),
    // OngoingClass.semester is a String (e.g. "Semester 1" or "1").
    // Use word-boundary regex so "1" matches "Semester 1" but not "11" or "12".
    if (student?.currentSemester) {
      f.semester = { $regex: `\\b${student.currentSemester}\\b`, $options: 'i' };
    }

    // Match academic session (student batch year e.g. "2025-2029")
    if (student?.session) {
      f.academicSession = { $regex: student.session, $options: 'i' };
    }

    // Match time session (Morning / Evening)
    if (student?.timeSession) {
      f.timeSession = student.timeSession;
    }

    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/student/dept-notices — notices from student's own department
const DeptNotice = require('../models/DeptNotice');
router.get('/dept-notices', verifyStudentToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('department');
    const notices = await DeptNotice.find({
      department: { $regex: new RegExp(`^${student.department}$`, 'i') },
      isPublished: true,
    }).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/student/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const student = await Student.findOne({ email: email.trim().toLowerCase() });
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
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required.' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const student = await Student.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!student) return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });

    student.password         = await bcrypt.hash(newPassword, 10);
    student.resetToken       = null;
    student.resetTokenExpiry = null;
    await student.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
