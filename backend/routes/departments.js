const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Department = require('../models/Department');

const { createStorage } = require('../utils/cloudinary');
const upload = multer({ storage: createStorage('departments', ['jpg', 'jpeg', 'png', 'webp']) });

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

// GET /api/departments — lightweight list for header + listing page
router.get('/', async (req, res) => {
  try {
    const depts = await Department.find()
      .select('name slug bannerImage hod description')
      .sort('name');
    res.json(depts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/departments/slug/:slug — full dept for frontend page
router.get('/slug/:slug', async (req, res) => {
  try {
    const dept = await Department.findOne({ slug: req.params.slug });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/departments/:id — full dept for admin editor
router.get('/:id', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
