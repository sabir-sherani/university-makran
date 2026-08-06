const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Department    = require('../models/Department');
const SuspensionOtp = require('../models/SuspensionOtp');
const { sendSuspensionOtpEmail } = require('../utils/mailer');
const { isDuplicateKeyError, duplicateKeyMessage } = require('../utils/duplicateKey');

const { createUpload } = require('../utils/cloudinary');
const upload = createUpload('departments', ['jpg', 'jpeg', 'png', 'webp']);

const deptUpload = upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'hodPhoto',    maxCount: 1 },
  ...Array.from({ length: 30 }, (_, i) => ({ name: `staffPhoto_${i}`,      maxCount: 1 })),
  ...Array.from({ length: 20 }, (_, i) => ({ name: `facilityImg_${i}`,     maxCount: 1 })),
  ...Array.from({ length: 20 }, (_, i) => ({ name: `engagementImg_${i}`,   maxCount: 1 })),
]);

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseJson(str, fallback = []) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function buildData(body, files, existing = {}) {
  const data = {};

  if (body.name !== undefined) data.name = body.name;
  data.slug = body.slug || (body.name ? slugify(body.name) : existing.slug);

  if (files?.bannerImage)
    data.bannerImage = files.bannerImage[0].path;

  // Tab 1
  if (body.aboutHeading     !== undefined) data.aboutHeading     = body.aboutHeading;
  if (body.aboutDescription !== undefined) data.aboutDescription = body.aboutDescription;

  // Tab 2 — HOD
  const hodPhoto = files?.hodPhoto
    ? files.hodPhoto[0].path
    : (body.existingHodPhoto || existing.hod?.photo || '');

  data.hod = {
    photo:              hodPhoto,
    name:               body.hodName               || '',
    qualification:      body.hodQualification      || '',
    email:              body.hodEmail              || '',
    descriptionHeading: body.hodDescriptionHeading || '',
    description:        body.hodDescription        || '',
  };

  // Tab 2 — Staff
  const staffRaw = parseJson(body.staffJson, []);
  data.staff = staffRaw.map((m, i) => {
    const f = files?.[`staffPhoto_${i}`];
    return {
      name:      m.name      || '',
      jobTitle:  m.jobTitle  || '',
      education: m.education || '',
      email:     m.email     || '',
      phone:     m.phone     || '',
      bio:       m.bio       || '',
      photo:     f ? f[0].path : (m.existingPhoto || m.photo || ''),
    };
  });

  // Tab 3
  if (body.feeHeading        !== undefined) data.feeHeading        = body.feeHeading;
  if (body.feeDescription    !== undefined) data.feeDescription    = body.feeDescription;
  if (body.feeAdmissionTitle !== undefined) data.feeAdmissionTitle = body.feeAdmissionTitle;
  if (body.feeSemesterTitle  !== undefined) data.feeSemesterTitle  = body.feeSemesterTitle;
  data.feeAdmissionRows = parseJson(body.feeAdmissionRowsJson, []);
  data.feeSemesterRows  = parseJson(body.feeSemesterRowsJson,  []);

  // Tab 4
  if (body.missionHeading     !== undefined) data.missionHeading     = body.missionHeading;
  if (body.missionDescription !== undefined) data.missionDescription = body.missionDescription;
  if (body.visionHeading      !== undefined) data.visionHeading      = body.visionHeading;
  if (body.visionDescription  !== undefined) data.visionDescription  = body.visionDescription;

  // Tab 5
  if (body.courseHeading     !== undefined) data.courseHeading     = body.courseHeading;
  if (body.courseDescription !== undefined) data.courseDescription = body.courseDescription;
  data.semesters = parseJson(body.semestersJson, []);

  // Tab 6
  data.degreePrograms = parseJson(body.degreeProgramsJson, []);

  // Tab 7 — Facilities & Resources
  const facilityImgs = parseJson(body.facilitiesImagesJson, []);
  data.facilitiesResources = {
    heading:     body.facilitiesHeading     || '',
    description: body.facilitiesDescription || '',
    images: facilityImgs.map((img, i) => {
      const f = files?.[`facilityImg_${i}`];
      return {
        image:    f ? f[0].path : (img.existingUrl || ''),
        subtitle: img.subtitle || '',
      };
    }),
  };

  // Tab 8 — Student Engagement
  const engagementImgs = parseJson(body.engagementImagesJson, []);
  data.studentEngagement = {
    heading:     body.engagementHeading     || '',
    description: body.engagementDescription || '',
    images: engagementImgs.map((img, i) => {
      const f = files?.[`engagementImg_${i}`];
      return {
        image:    f ? f[0].path : (img.existingUrl || ''),
        subtitle: img.subtitle || '',
      };
    }),
  };

  return data;
}

// GET /api/departments — lightweight list
// ?all=1  → include suspended (admin panel only)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.all === '1'
      ? { deletedAt: null }
      : { deletedAt: null, suspended: { $ne: true } };
    const depts = await Department.find(filter)
      .select('name slug bannerImage hod description suspended')
      .sort('name');
    res.json(depts);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/departments/trash — soft-deleted items
router.get('/trash', async (req, res) => {
  try {
    const depts = await Department.find({ deletedAt: { $ne: null } })
      .select('name slug bannerImage deletedAt')
      .sort({ deletedAt: -1 });
    res.json(depts);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/departments/slug/:slug — full dept for frontend page
router.get('/slug/:slug', async (req, res) => {
  try {
    const dept = await Department.findOne({ slug: req.params.slug });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    if (dept.suspended) return res.status(403).json({ message: 'Department is currently suspended.', suspended: true });
    res.json(dept);
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/departments/:id/suspend-otp — generate & email OTP (stored in DB)
router.post('/:id/suspend-otp', async (req, res) => {
  try {
    const { action } = req.body; // 'suspend' | 'unsuspend'
    if (!['suspend', 'unsuspend'].includes(action))
      return res.status(400).json({ message: 'Invalid action.' });

    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Upsert — replace any existing OTP for this dept+action
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await SuspensionOtp.findOneAndUpdate(
      { deptId: req.params.id, action },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    const adminEmail = process.env.GMAIL_USER;
    await sendSuspensionOtpEmail(adminEmail, dept.name, otp, action);

    res.json({ message: `OTP sent to ${adminEmail}` });
  } catch (err) {
    res.sendServerError(err);
  }
});

// PATCH /api/departments/:id/suspend — verify OTP and toggle suspended
router.patch('/:id/suspend', async (req, res) => {
  try {
    const { action, otp } = req.body;
    if (!['suspend', 'unsuspend'].includes(action))
      return res.status(400).json({ message: 'Invalid action.' });
    if (!otp) return res.status(400).json({ message: 'OTP is required.' });

    const record = await SuspensionOtp.findOne({ deptId: req.params.id, action });

    if (!record)
      return res.status(400).json({ message: 'No OTP requested. Please request a new one.' });
    if (new Date() > record.expiresAt) {
      await SuspensionOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== String(otp).trim())
      return res.status(400).json({ message: 'Incorrect OTP.' });

    // OTP correct — delete it and suspend the department
    await SuspensionOtp.deleteOne({ _id: record._id });
    const suspended = action === 'suspend';
    const dept = await Department.findByIdAndUpdate(req.params.id, { suspended }, { new: true });
    res.json({ message: `Department ${suspended ? 'suspended' : 'unsuspended'} successfully.`, dept });
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/departments/:id — full dept for admin editor
router.get('/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/departments
router.post('/', deptUpload, async (req, res) => {
  try {
    const data = buildData(req.body, req.files);
    const dept = new Department(data);
    const saved = await dept.save();
    res.status(201).json(saved);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/departments/:id
router.put('/:id', deptUpload, async (req, res) => {
  try {
    const existing = await Department.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Department not found' });
    const data = buildData(req.body, req.files, existing.toObject());
    const dept = await Department.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(dept);
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/departments/:id/restore
router.patch('/:id/restore', async (req, res) => {
  try {
    await Department.findByIdAndUpdate(req.params.id, { deletedAt: null });
    res.json({ message: 'Department restored' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// DELETE /api/departments/:id/permanent
router.delete('/:id/permanent', async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department permanently deleted' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// DELETE /api/departments/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    await Department.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Department moved to trash' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
