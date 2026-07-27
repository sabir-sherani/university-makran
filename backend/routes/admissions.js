const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Admission = require('../models/Admission');

const { createStorage } = require('../utils/cloudinary');
const upload = multer({ storage: createStorage('admissions', ['jpg', 'jpeg', 'png']) });

// GET all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Admission.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create application (multipart — profile picture required)
router.post('/apply', upload.single('profilePicture'), async (req, res) => {
  try {
    const b = req.body;
    const errors = [];

    // ── Required text fields ──────────────────────────────────────────
    const required = [
      ['department',       'Department'],
      ['program',          'Program'],
      ['candidateName',    'Candidate name'],
      ['fatherName',       'Father name'],
      ['email',            'Email'],
      ['cnic',             'CNIC'],
      ['dob',              'Date of birth'],
      ['gender',           'Gender'],
      ['phone',            'Phone number'],
      ['whatsapp',         'WhatsApp number'],
      ['nationality',      'Nationality'],
      ['city',             'City'],
      ['currentAddress',   'Current address'],
      ['permanentAddress', 'Permanent address'],
    ];
    for (const [field, label] of required) {
      if (!b[field] || !String(b[field]).trim())
        errors.push(`${label} is required.`);
    }

    // ── Format checks (only if field is present) ──────────────────────
    if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()))
      errors.push('Invalid email format.');

    if (b.cnic && !/^\d{5}-\d{7}-\d$/.test(b.cnic.trim()))
      errors.push('CNIC must be in the format XXXXX-XXXXXXX-X.');

    if (b.phone && !/^0\d{10}$/.test(b.phone.trim().replace(/[\s-]/g, '')))
      errors.push('Phone must be 11 digits starting with 0.');

    if (b.whatsapp && !/^0\d{10}$/.test(b.whatsapp.trim().replace(/[\s-]/g, '')))
      errors.push('WhatsApp must be 11 digits starting with 0.');

    // ── Date of birth ─────────────────────────────────────────────────
    if (b.dob) {
      const dob   = new Date(b.dob);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (isNaN(dob.getTime()))
        errors.push('Invalid date of birth.');
      else if (dob >= today)
        errors.push('Date of birth cannot be today or a future date.');
      else {
        const minAge = new Date(today); minAge.setFullYear(today.getFullYear() - 14);
        if (dob > minAge) errors.push('Applicant must be at least 14 years old.');
      }
    }

    // ── Profile picture ───────────────────────────────────────────────
    if (!req.file) errors.push('Profile picture is required.');

    // ── Academic qualifications ───────────────────────────────────────
    let quals = {};
    try { quals = JSON.parse(b.qualifications || '{}'); } catch {}

    const currentYear = new Date().getFullYear();
    const requiredQuals = ['matric', 'intermediate'];
    for (const key of requiredQuals) {
      const q = quals[key];
      if (!q) { errors.push(`${key} qualification is required.`); continue; }
      if (!q.degreeTitle?.trim())    errors.push(`${key}: degree title is required.`);
      if (!q.passingYear)            errors.push(`${key}: passing year is required.`);
      else {
        const yr = parseInt(q.passingYear);
        if (yr < 1980 || yr > currentYear)
          errors.push(`${key}: passing year must be between 1980 and ${currentYear}.`);
      }
      if (!q.obtainedMarks?.trim())  errors.push(`${key}: obtained marks are required.`);
      if (!q.totalMarks?.trim())     errors.push(`${key}: total marks are required.`);
      const obt = parseFloat(q.obtainedMarks), tot = parseFloat(q.totalMarks);
      if (!isNaN(obt) && !isNaN(tot)) {
        if (obt > tot)  errors.push(`${key}: obtained marks cannot exceed total marks.`);
        if (tot <= 0)   errors.push(`${key}: total marks must be greater than 0.`);
      }
    }

    if (errors.length > 0)
      return res.status(422).json({ message: errors[0], errors });

    const data = { ...b };
    if (req.file) data.profilePicture = req.file.path;
    const saved = await new Admission(data).save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST bulk delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'ids array is required' });
    const result = await Admission.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${result.deletedCount} application(s)` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update status
router.put('/:id', async (req, res) => {
  try {
    const application = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
