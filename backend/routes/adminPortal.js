const express = require('express');
const router = express.Router();
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
const { verifyAdminToken } = require('../middleware/auth');

const { createStorage } = require('../utils/cloudinary');
const upload = multer({ storage: createStorage('portal/admin'), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/portal/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: admin._id, role: 'admin', email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const adminData = admin.toObject();
    delete adminData.password;
    res.json({ token, admin: adminData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/admin/stats
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const [totalStudents, pendingStudents, totalTeachers, pendingTeachers] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'pending' }),
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'pending' }),
    ]);
    res.json({ totalStudents, pendingStudents, totalTeachers, pendingTeachers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/admin/students
router.get('/students', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, program, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { registrationNo: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const students = await Student.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/admin/students/:id/status
router.patch('/students/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: `Student status updated to ${status}.`, student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/admin/students/:id/academic — update CGPA, attendance, roll no, semester
router.patch('/students/:id/academic', verifyAdminToken, async (req, res) => {
  try {
    const allowed = ['rollNo', 'currentSemester', 'cgpa', 'attendancePercentage'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const student = await Student.findByIdAndUpdate(
      req.params.id, { $set: updates }, { new: true, runValidators: true }
    ).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: 'Academic info updated.', student });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/portal/admin/students/:id
router.delete('/students/:id', verifyAdminToken, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
      department: { $regex: department.trim(), $options: 'i' },
      session: { $regex: session.trim(), $options: 'i' },
    };
    const students = await Student.find(filter)
      .select('_id fullName registrationNo rollNo department program session currentSemester')
      .sort({ fullName: 1 });
    res.json({ count: students.length, students });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/admin/teachers
router.get('/teachers', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { teacherId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const teachers = await Teacher.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/admin/teachers/:id/status
router.patch('/teachers/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).select('-password');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json({ message: `Teacher status updated to ${status}.`, teacher });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/portal/admin/teachers/:id
router.delete('/teachers/:id', verifyAdminToken, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });
    res.json({ message: 'Teacher deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/admin/teacher-ids
router.get('/teacher-ids', verifyAdminToken, async (req, res) => {
  try {
    const slots = await TeacherIdSlot.find().sort({ createdAt: -1 });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/portal/admin/teacher-ids
router.post('/teacher-ids', verifyAdminToken, async (req, res) => {
  try {
    const { teacherId } = req.body;
    const slot = new TeacherIdSlot({ teacherId });
    await slot.save();
    res.status(201).json({ message: 'Teacher ID created successfully.', slot });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Teacher ID already exists.' });
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/admin/teacher-ids/:id
router.patch('/teacher-ids/:id', verifyAdminToken, async (req, res) => {
  try {
    const { teacherId } = req.body;
    const slot = await TeacherIdSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Teacher ID not found.' });
    if (slot.isUsed) return res.status(400).json({ message: 'Cannot edit a Teacher ID that is already in use by a registered teacher.' });
    slot.teacherId = teacherId;
    await slot.save();
    res.json({ message: 'Teacher ID updated successfully.', slot });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'That Teacher ID already exists.' });
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/portal/admin/teacher-ids/:id
router.delete('/teacher-ids/:id', verifyAdminToken, async (req, res) => {
  try {
    const slot = await TeacherIdSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Teacher ID not found.' });
    res.json({ message: 'Teacher ID deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portal/admin/datesheets  (with optional filters)
router.get('/datesheets', verifyAdminToken, async (req, res) => {
  try {
    const { department, program, semester, examType, session, timeSession, isPublished } = req.query;
    const f = {};
    if (department)  f.department  = { $regex: department,  $options: 'i' };
    if (program)     f.program     = { $regex: program,     $options: 'i' };
    if (semester)    f.semester    = semester;
    if (examType)    f.examType    = examType;
    if (session)     f.session     = { $regex: session,     $options: 'i' };
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
    res.status(500).json({ message: error.message });
  }
});

// POST /api/portal/admin/datesheets
router.post('/datesheets', verifyAdminToken, upload.single('file'), async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession } = req.body;
    const datesheet = new DateSheet({
      title, examType, semester, department, program, session, timeSession: timeSession || undefined,
      uploadedBy: req.user.id,
      uploadedByRole: 'admin',
      fileUrl: req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
    });
    await datesheet.save();
    res.status(201).json({ message: 'Date sheet uploaded successfully.', datesheet });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/admin/datesheets/:id  (edit)
router.patch('/datesheets/:id', verifyAdminToken, upload.single('file'), async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession } = req.body;
    const ds = await DateSheet.findById(req.params.id);
    if (!ds) return res.status(404).json({ message: 'Date sheet not found.' });
    if (title)                        ds.title       = title;
    if (examType)                     ds.examType    = examType;
    if (semester  !== undefined)      ds.semester    = semester;
    if (department !== undefined)     ds.department  = department;
    if (program   !== undefined)      ds.program     = program;
    if (session   !== undefined)      ds.session     = session;
    if (timeSession !== undefined)    ds.timeSession = timeSession || undefined;
    if (req.file) { ds.fileUrl = req.file.path; ds.fileName = req.file.originalname; }
    await ds.save();
    res.json({ message: 'Date sheet updated.', datesheet: ds });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/portal/admin/datesheets/:id
router.delete('/datesheets/:id', verifyAdminToken, async (req, res) => {
  try {
    const ds = await DateSheet.findByIdAndDelete(req.params.id);
    if (!ds) return res.status(404).json({ message: 'Date sheet not found.' });
    res.json({ message: 'Date sheet deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
});

// POST /api/portal/admin/results
router.post('/results', verifyAdminToken, upload.single('file'), async (req, res) => {
  try {
    const { title, examType, semester, department, program, session, timeSession, results } = req.body;
    const result = new Result({
      title, examType, semester, department, program, session, timeSession: timeSession || undefined,
      uploadedBy: req.user.id,
      uploadedByRole: 'admin',
      fileUrl: req.file ? req.file.path : null,
      fileName: req.file ? req.file.originalname : null,
      results: results ? JSON.parse(results) : [],
    });
    await result.save();
    res.status(201).json({ message: 'Results uploaded successfully.', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/portal/admin/results/:id/publish
router.patch('/results/:id/publish', verifyAdminToken, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ message: 'Result not found.' });
    result.isPublished = !result.isPublished;
    await result.save();
    res.json({ message: `Result ${result.isPublished ? 'published' : 'unpublished'}.`, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ══════════════════════════════════════════════════════
// STAFF MANAGEMENT  (HOD / Exam Section / Finance)
// ══════════════════════════════════════════════════════
const HOD            = require('../models/HOD');
const ExaminationStaff = require('../models/ExaminationStaff');
const FinanceStaff   = require('../models/FinanceStaff');

// ── HOD ──────────────────────────────────────────────
router.get('/staff/hod', verifyAdminToken, async (req, res) => {
  try {
    const hods = await HOD.find().select('-password').sort({ createdAt: -1 });
    res.json(hods);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff/hod', verifyAdminToken, async (req, res) => {
  try {
    const { hodId, fullName, email, password, phone, cnic, department, designation, qualification } = req.body;
    if (!hodId || !fullName || !email || !password || !department)
      return res.status(400).json({ message: 'hodId, fullName, email, password and department are required.' });
    const hashed = await bcrypt.hash(password, 10);
    const hod = await new HOD({ hodId, fullName, email, phone, cnic, department, designation, qualification, password: hashed }).save();
    const data = hod.toObject(); delete data.password;
    res.status(201).json(data);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `${field} already exists.` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/hod/:id', verifyAdminToken, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
    const hod = await HOD.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json(hod);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/hod/:id', verifyAdminToken, async (req, res) => {
  try {
    await HOD.findByIdAndDelete(req.params.id);
    res.json({ message: 'HOD account deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Examination Staff ─────────────────────────────────
router.get('/staff/exam', verifyAdminToken, async (req, res) => {
  try {
    const staff = await ExaminationStaff.find().select('-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff/exam', verifyAdminToken, async (req, res) => {
  try {
    const { examId, fullName, email, password, phone, cnic, designation, section } = req.body;
    if (!examId || !fullName || !email || !password)
      return res.status(400).json({ message: 'examId, fullName, email and password are required.' });
    const hashed = await bcrypt.hash(password, 10);
    const staff = await new ExaminationStaff({ examId, fullName, email, phone, cnic, designation, section, password: hashed }).save();
    const data = staff.toObject(); delete data.password;
    res.status(201).json(data);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `${field} already exists.` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/exam/:id', verifyAdminToken, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
    const staff = await ExaminationStaff.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/exam/:id', verifyAdminToken, async (req, res) => {
  try {
    await ExaminationStaff.findByIdAndDelete(req.params.id);
    res.json({ message: 'Exam staff account deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Finance Staff ─────────────────────────────────────
router.get('/staff/finance', verifyAdminToken, async (req, res) => {
  try {
    const staff = await FinanceStaff.find().select('-password').sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff/finance', verifyAdminToken, async (req, res) => {
  try {
    const { financeId, fullName, email, password, phone, cnic, designation, department } = req.body;
    if (!financeId || !fullName || !email || !password)
      return res.status(400).json({ message: 'financeId, fullName, email and password are required.' });
    const hashed = await bcrypt.hash(password, 10);
    const staff = await new FinanceStaff({ financeId, fullName, email, phone, cnic, designation, department, password: hashed }).save();
    const data = staff.toObject(); delete data.password;
    res.status(201).json(data);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(400).json({ message: `${field} already exists.` });
    }
    res.status(400).json({ message: err.message });
  }
});

router.patch('/staff/finance/:id', verifyAdminToken, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
    const staff = await FinanceStaff.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json(staff);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/finance/:id', verifyAdminToken, async (req, res) => {
  try {
    await FinanceStaff.findByIdAndDelete(req.params.id);
    res.json({ message: 'Finance staff account deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════
// ONGOING CLASSES
// ══════════════════════════════════════════════════════
const OngoingClass = require('../models/OngoingClass');

// GET /api/portal/admin/ongoing-classes
router.get('/ongoing-classes', verifyAdminToken, async (req, res) => {
  try {
    const { department, program, semester, status, academicSession, timeSession } = req.query;
    const f = {};
    if (department)     f.department     = { $regex: department,     $options: 'i' };
    if (program)        f.program        = { $regex: program,        $options: 'i' };
    if (semester)       f.semester       = semester;
    if (status)         f.status         = status;
    if (academicSession)f.academicSession= { $regex: academicSession,$options: 'i' };
    if (timeSession)    f.timeSession    = timeSession;
    const classes = await OngoingClass.find(f).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/portal/admin/ongoing-classes
router.post('/ongoing-classes', verifyAdminToken, async (req, res) => {
  try {
    const cls = await new OngoingClass({ ...req.body, createdBy: req.user.id, createdByRole: 'admin' }).save();
    res.status(201).json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH /api/portal/admin/ongoing-classes/:id
router.patch('/ongoing-classes/:id', verifyAdminToken, async (req, res) => {
  try {
    const cls = await OngoingClass.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cls) return res.status(404).json({ message: 'Class not found.' });
    res.json(cls);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE /api/portal/admin/ongoing-classes/:id
router.delete('/ongoing-classes/:id', verifyAdminToken, async (req, res) => {
  try {
    await OngoingClass.findByIdAndDelete(req.params.id);
    res.json({ message: 'Class deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
    if (department)  f.department  = { $regex: department, $options: 'i' };
    if (semester)    f.semester    = semester;
    if (subject)     f.subject     = { $regex: subject, $options: 'i' };
    if (examType)    f.examType    = examType;
    if (status)      f.status      = status;
    if (teacherName) f.teacherName = { $regex: teacherName, $options: 'i' };
    const sheets = await ResultSheet.find(f).sort({ createdAt: -1 });
    res.json(sheets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/admin/reports/corrections
router.get('/reports/corrections', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.query;
    const f = status ? { status } : {};
    const reqs = await CorrectionRequest.find(f).sort({ createdAt: -1 });
    res.json(reqs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/admin/reports/admissions
router.get('/reports/admissions', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, program, gender } = req.query;
    const f = {};
    if (status)     f.status     = status;
    if (department) f.department = { $regex: department, $options: 'i' };
    if (program)    f.program    = { $regex: program, $options: 'i' };
    if (gender)     f.gender     = gender;
    const admissions = await Admission.find(f).sort({ createdAt: -1 });
    res.json(admissions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/portal/admin/reports/challans
router.get('/reports/challans', verifyAdminToken, async (req, res) => {
  try {
    const { status, department, program, semester } = req.query;
    const f = {};
    if (status)     f.status     = status;
    if (department) f.department = { $regex: department, $options: 'i' };
    if (program)    f.program    = { $regex: program, $options: 'i' };
    if (semester)   f.semester   = semester;
    const challans = await FeeChallan.find(f).sort({ issuedAt: -1 });
    res.json(challans);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Academic Sessions ─────────────────────────────────────────────────────────
const AcademicSession = require('../models/AcademicSession');

router.get('/sessions', verifyAdminToken, async (req, res) => {
  try {
    const sessions = await AcademicSession.find().sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/sessions', verifyAdminToken, async (req, res) => {
  try {
    const session = await new AcademicSession(req.body).save();
    res.status(201).json(session);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Session name already exists.' });
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

router.delete('/sessions/:id', verifyAdminToken, async (req, res) => {
  try {
    await AcademicSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Semesters ─────────────────────────────────────────────────────────────────
const Semester = require('../models/Semester');

router.get('/semesters', verifyAdminToken, async (req, res) => {
  try {
    const { department, program, status } = req.query;
    const f = {};
    if (department) f.department = { $regex: department, $options: 'i' };
    if (program)    f.program    = { $regex: program, $options: 'i' };
    if (status)     f.status     = status;
    const semesters = await Semester.find(f).sort({ number: 1, createdAt: -1 });
    res.json(semesters);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/semesters', verifyAdminToken, async (req, res) => {
  try {
    const sem = await new Semester(req.body).save();
    res.status(201).json(sem);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.patch('/semesters/:id', verifyAdminToken, async (req, res) => {
  try {
    const sem = await Semester.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sem) return res.status(404).json({ message: 'Semester not found.' });
    res.json(sem);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/semesters/:id', verifyAdminToken, async (req, res) => {
  try {
    await Semester.findByIdAndDelete(req.params.id);
    res.json({ message: 'Semester deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
