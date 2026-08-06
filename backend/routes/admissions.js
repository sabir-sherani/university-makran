const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { body } = require('express-validator');
const Admission = require('../models/Admission');
const {
  personName, email, cnic, phone, dateOfBirth, enumField, requiredString, mongoId, validate, enums,
} = require('../validators');

const { createUpload } = require('../utils/cloudinary');
const upload = createUpload('admissions', ['jpg', 'jpeg', 'png']);

// GET all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Admission.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.sendServerError(error);
  }
});

// POST create application (multipart — profile picture required)
router.post('/apply', upload.single('profilePicture'), [
  requiredString('department', { max: 120 }),
  requiredString('program', { max: 120 }),
  personName('candidateName'),
  personName('fatherName'),
  email('email'),
  cnic('cnic'),
  dateOfBirth('dob', { toDate: false }),
  enumField('gender', enums.GENDER),
  phone('phone'),
  phone('whatsapp'),
  requiredString('nationality', { max: 60 }),
  requiredString('city', { max: 60 }),
  requiredString('currentAddress', { max: 300 }),
  requiredString('permanentAddress', { max: 300 }),
  validate,
], async (req, res) => {
  try {
    const b = req.body;
    const errors = {};

    // ── Profile picture ───────────────────────────────────────────────
    if (!req.file) errors.profilePicture = 'Profile picture is required.';

    // ── Academic qualifications ───────────────────────────────────────
    let quals = {};
    try { quals = JSON.parse(b.qualifications || '{}'); } catch {}

    const currentYear = new Date().getFullYear();
    const requiredQuals = ['matric', 'intermediate'];
    for (const key of requiredQuals) {
      const q = quals[key];
      if (!q) { errors[`qualifications.${key}`] = `${key} qualification is required.`; continue; }
      if (!q.degreeTitle?.trim())    errors[`qualifications.${key}.degreeTitle`] = `${key}: degree title is required.`;
      if (!q.passingYear)            errors[`qualifications.${key}.passingYear`] = `${key}: passing year is required.`;
      else {
        const yr = parseInt(q.passingYear);
        if (yr < 1980 || yr > currentYear)
          errors[`qualifications.${key}.passingYear`] = `${key}: passing year must be between 1980 and ${currentYear}.`;
      }
      if (!q.obtainedMarks?.trim())  errors[`qualifications.${key}.obtainedMarks`] = `${key}: obtained marks are required.`;
      if (!q.totalMarks?.trim())     errors[`qualifications.${key}.totalMarks`] = `${key}: total marks are required.`;
      const obt = parseFloat(q.obtainedMarks), tot = parseFloat(q.totalMarks);
      if (!isNaN(obt) && !isNaN(tot)) {
        if (obt > tot)  errors[`qualifications.${key}.obtainedMarks`] = `${key}: obtained marks cannot exceed total marks.`;
        if (tot <= 0)   errors[`qualifications.${key}.totalMarks`]    = `${key}: total marks must be greater than 0.`;
      }
    }

    if (Object.keys(errors).length > 0)
      return res.status(400).json({ message: 'Validation failed.', errors });

    const data = { ...b };
    if (req.file) data.profilePicture = req.file.path;
    const saved = await new Admission(data).save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST bulk delete
router.post('/bulk-delete', [
  body('ids').isArray({ min: 1 }).withMessage('ids array is required.'),
  body('ids.*').isMongoId().withMessage('ids must contain valid ids.'),
  validate,
], async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await Admission.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${result.deletedCount} application(s)` });
  } catch (error) {
    res.sendServerError(error);
  }
});

// PUT update status
router.put('/:id', [enumField('status', enums.ADMISSION_STATUS), validate], async (req, res) => {
  try {
    const application = await Admission.findByIdAndUpdate(
      req.params.id, { status: req.body.status }, { new: true, runValidators: true }
    );
    res.json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE single application
router.delete('/:id', async (req, res) => {
  try {
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted' });
  } catch (error) {
    res.sendServerError(error);
  }
});

module.exports = router;
