// Public lookup endpoints backing every department/program/session/semester/
// designation dropdown across the site — the single source of truth so forms
// never accept free-text for these official fields.
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Department = require('../models/Department');
const Program = require('../models/Program');
const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const Designation = require('../models/Designation');
const Course = require('../models/Course');
const CreditHourPolicy = require('../models/CreditHourPolicy');
const Room = require('../models/Room');
const {
  DEPARTMENT_ACTIVE, PROGRAM_ACTIVE, SESSION_ACTIVE, SEMESTER_ACTIVE, DESIGNATION_ACTIVE, COURSE_ACTIVE, ROOM_ACTIVE,
} = require('../validators/refFilters');

// GET /api/lookups/departments
router.get('/departments', async (req, res) => {
  try {
    const depts = await Department.find(DEPARTMENT_ACTIVE).select('name slug').sort('name');
    res.json(depts);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/programs?department=<id>
router.get('/programs', async (req, res) => {
  try {
    const filter = { ...PROGRAM_ACTIVE };
    if (req.query.department) {
      if (!mongoose.isValidObjectId(req.query.department)) {
        return res.status(400).json({ message: 'Invalid department id.' });
      }
      filter.department = req.query.department;
    }
    const programs = await Program.find(filter).select('title category department').sort('title');
    res.json(programs);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await AcademicSession.find(SESSION_ACTIVE).select('name startYear endYear status').sort({ name: -1 });
    res.json(sessions);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/semesters?program=<id>
router.get('/semesters', async (req, res) => {
  try {
    const filter = { ...SEMESTER_ACTIVE };
    if (req.query.program) {
      if (!mongoose.isValidObjectId(req.query.program)) {
        return res.status(400).json({ message: 'Invalid program id.' });
      }
      filter.programId = req.query.program;
    }
    const semesters = await Semester.find(filter).select('name number programId departmentId').sort('number');
    res.json(semesters);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/designations
router.get('/designations', async (req, res) => {
  try {
    const designations = await Designation.find(DESIGNATION_ACTIVE).select('title').sort('title');
    res.json(designations);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/courses?program=<id>&semester=<n>&department=<id>
// The canonical course catalogue (see models/Course.js) — every subject
// dropdown (HOD class assignment, timetable, result sheets) reads from here
// instead of accepting free-text subject names.
router.get('/courses', async (req, res) => {
  try {
    const filter = { ...COURSE_ACTIVE };
    if (req.query.program) {
      if (!mongoose.isValidObjectId(req.query.program)) {
        return res.status(400).json({ message: 'Invalid program id.' });
      }
      filter.programId = req.query.program;
    }
    if (req.query.department) {
      if (!mongoose.isValidObjectId(req.query.department)) {
        return res.status(400).json({ message: 'Invalid department id.' });
      }
      filter.departmentId = req.query.department;
    }
    if (req.query.semester) {
      const n = Number(req.query.semester);
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        return res.status(400).json({ message: 'semester must be an integer between 1 and 8.' });
      }
      filter.semesterNumber = n;
    }
    const courses = await Course.find(filter)
      .select('code title creditHours isLab program programId department departmentId semesterNumber')
      .sort({ semesterNumber: 1, code: 1 });
    res.json(courses);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/credit-hour-policies?department=<id>
// Read-only mirror of the HOD-editable policies (routes/hodPortal.js
// GET/PATCH /credit-hour-policies) — used wherever a required-sessions
// calculation needs to run without an HOD's own auth context (e.g. a
// teacher viewing their own timetable). University-wide defaults have
// departmentId: null and are returned whenever a department has no
// department-specific override for a given (creditHours, isLab) pair.
router.get('/credit-hour-policies', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.department) {
      if (!mongoose.isValidObjectId(req.query.department)) {
        return res.status(400).json({ message: 'Invalid department id.' });
      }
      filter.$or = [{ departmentId: req.query.department }, { departmentId: null }];
    }
    const policies = await CreditHourPolicy.find(filter).sort({ creditHours: 1, isLab: 1 });
    res.json(policies);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/lookups/rooms?department=<id>&type=&capacityAtLeast=
// Every room-picking dropdown (HOD timetable, ongoing-class assignment)
// reads from here instead of accepting free-text room names. departmentId:
// null rooms (shared/university-wide) are always included alongside a
// department's own rooms.
router.get('/rooms', async (req, res) => {
  try {
    const filter = { ...ROOM_ACTIVE };
    if (req.query.department) {
      if (!mongoose.isValidObjectId(req.query.department)) {
        return res.status(400).json({ message: 'Invalid department id.' });
      }
      filter.$or = [{ departmentId: req.query.department }, { departmentId: null }];
    }
    if (req.query.type) {
      if (!['classroom', 'lab', 'seminar'].includes(req.query.type)) {
        return res.status(400).json({ message: 'Invalid room type.' });
      }
      filter.type = req.query.type;
    }
    if (req.query.capacityAtLeast) {
      const n = Number(req.query.capacityAtLeast);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'capacityAtLeast must be a non-negative number.' });
      }
      filter.capacity = { $gte: n };
    }
    const rooms = await Room.find(filter)
      .select('code name departmentId department building capacity type')
      .sort({ code: 1 });
    res.json(rooms);
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
