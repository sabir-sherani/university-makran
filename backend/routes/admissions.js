const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { body } = require('express-validator');
const Admission = require('../models/Admission');
const AdmissionBatch = require('../models/AdmissionBatch');
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

    // ── Admissions must be open ───────────────────────────────────────
    // Checked here and not only in the browser: the form is a plain POST and
    // nothing stops someone submitting it after the closing date.
    const batch = await AdmissionBatch.findAccepting();
    if (!batch) {
      const lapsed = await AdmissionBatch.findOpenFlagged();
      return res.status(403).json({
        message: lapsed
          ? `Admissions for batch ${lapsed.name} closed on ${new Date(lapsed.lastDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. No new applications are being accepted.`
          : 'Admissions are currently closed. Please check back when the next batch opens.',
        closed: true,
      });
    }

    // ── One application per person per batch ──────────────────────────
    // CNIC, email and phone are all treated as the same person. Phone has
    // already been normalised to 03XXXXXXXXX by the validator chain above and
    // CNIC has a single fixed format, so these compare reliably.
    const cnicVal  = String(b.cnic  || '').trim();
    const emailVal = String(b.email || '').trim().toLowerCase();
    const phoneVal = String(b.phone || '').trim();

    const existing = await Admission.findOne({
      batchId: batch._id,
      $or: [{ cnic: cnicVal }, { email: emailVal }, { phone: phoneVal }],
    }).select('cnic email phone department status createdAt');

    if (existing) {
      const matched = existing.cnic === cnicVal
        ? 'CNIC'
        : existing.email === emailVal ? 'email address' : 'phone number';
      return res.status(409).json({
        message: `An application has already been submitted for batch ${batch.name} using this ${matched}. Only one application per applicant is allowed per batch.`,
        duplicate: true,
        matchedOn: matched,
      });
    }

    const data = { ...b, email: emailVal, batchId: batch._id, batchName: batch.name };
    if (req.file) data.profilePicture = req.file.path;

    try {
      const saved = await new Admission(data).save();
      return res.status(201).json(saved);
    } catch (err) {
      // Two submissions racing each other: the check above passed for both, the
      // unique index caught the second. Same answer as the check would give.
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {}).find((k) => k !== 'batchId') || 'details';
        const label = field === 'cnic' ? 'CNIC' : field === 'email' ? 'email address' : 'phone number';
        return res.status(409).json({
          message: `An application has already been submitted for batch ${batch.name} using this ${label}. Only one application per applicant is allowed per batch.`,
          duplicate: true,
          matchedOn: label,
        });
      }
      throw err;
    }
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
