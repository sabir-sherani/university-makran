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
const {
  DEPARTMENT_ACTIVE, PROGRAM_ACTIVE, SESSION_ACTIVE, SEMESTER_ACTIVE, DESIGNATION_ACTIVE,
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

module.exports = router;
