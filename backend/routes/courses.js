const express = require('express');
const router = express.Router();
const SemesterCourse = require('../models/SemesterCourse');
const { isDuplicateKeyError, duplicateKeyMessage } = require('../utils/duplicateKey');

// GET /api/courses?program=id
router.get('/', async (req, res) => {
  try {
    const filter = req.query.program ? { program: req.query.program } : {};
    const courses = await SemesterCourse.find(filter).sort('semesterNumber');
    res.json(courses);
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/courses — upsert: create or replace a semester's course list
router.post('/', async (req, res) => {
  try {
    const { program, semesterNumber, courses } = req.body;
    if (!program || !semesterNumber) {
      return res.status(400).json({ message: 'program and semesterNumber are required' });
    }
    const semester = await SemesterCourse.findOneAndUpdate(
      { program, semesterNumber: Number(semesterNumber) },
      { program, semesterNumber: Number(semesterNumber), courses: courses || [] },
      { upsert: true, new: true }
    );
    res.status(201).json(semester);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', async (req, res) => {
  try {
    await SemesterCourse.findByIdAndDelete(req.params.id);
    res.json({ message: 'Semester deleted' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
