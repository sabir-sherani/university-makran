const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdministrationDept = require('../models/AdministrationDept');

const { createStorage } = require('../utils/cloudinary');
const upload = multer({ storage: createStorage('administration', ['jpg', 'jpeg', 'png', 'webp']) });

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Dynamic upload: hodImage + up to 20 staff images
const adminUpload = upload.fields([
  { name: 'hodImage', maxCount: 1 },
  ...Array.from({ length: 20 }, (_, i) => ({ name: `staffImage_${i}`, maxCount: 1 })),
]);

// GET /api/admin-depts — list all active (lightweight)
router.get('/', async (req, res) => {
  try {
    const depts = await AdministrationDept.find({ deletedAt: null })
      .select('name slug about hod order')
      .sort({ order: 1, name: 1 });
    res.json(depts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin-depts/trash — soft-deleted items
router.get('/trash', async (req, res) => {
  try {
    const depts = await AdministrationDept.find({ deletedAt: { $ne: null } })
      .select('name slug hod order deletedAt')
      .sort({ deletedAt: -1 });
    res.json(depts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin-depts/slug/:slug — full dept detail
router.get('/slug/:slug', async (req, res) => {
  try {
    const dept = await AdministrationDept.findOne({ slug: req.params.slug });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin-depts/:id
router.get('/:id', async (req, res) => {
  try {
    const dept = await AdministrationDept.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin-depts
router.post('/', adminUpload, async (req, res) => {
  try {
    const { name, about, hodName, hodPosition, hodSpecialization, hodAbout, hodMessage, staffJson, order } = req.body;

    const slug = slugify(name);

    const hodImage = req.files?.hodImage?.[0]
      ? req.files.hodImage[0].path
      : '';

    const hod = { image: hodImage, name: hodName || '', position: hodPosition || '', specialization: hodSpecialization || '', about: hodAbout || '', message: hodMessage || '' };

    let staff = [];
    if (staffJson) {
      const parsed = JSON.parse(staffJson);
      staff = parsed.map((member, i) => ({
        name:      member.name || '',
        jobTitle:  member.jobTitle || '',
        education: member.education || '',
        email:     member.email || '',
        phone:     member.phone || '',
        bio:       member.bio || '',
        image: req.files?.[`staffImage_${i}`]?.[0]
          ? req.files[`staffImage_${i}`][0].path
          : member.image || '',
      }));
    }

    const dept = new AdministrationDept({ name, slug, about, hod, staff, order: order || 0 });
    const saved = await dept.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/admin-depts/:id
router.put('/:id', adminUpload, async (req, res) => {
  try {
    const existing = await AdministrationDept.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Department not found' });

    const { name, about, hodName, hodPosition, hodSpecialization, hodAbout, hodMessage, staffJson, order } = req.body;

    const hodImage = req.files?.hodImage?.[0]
      ? req.files.hodImage[0].path
      : existing.hod?.image || '';

    const hod = {
      image:          hodImage,
      name:           hodName     !== undefined ? hodName     : existing.hod?.name     || '',
      position:       hodPosition !== undefined ? hodPosition : existing.hod?.position || '',
      specialization: hodSpecialization !== undefined ? hodSpecialization : existing.hod?.specialization || '',
      about:          hodAbout    !== undefined ? hodAbout    : existing.hod?.about    || '',
      message:        hodMessage  !== undefined ? hodMessage  : existing.hod?.message  || '',
    };

    let staff = existing.staff;
    if (staffJson) {
      const parsed = JSON.parse(staffJson);
      staff = parsed.map((member, i) => ({
        name:      member.name || '',
        jobTitle:  member.jobTitle || '',
        education: member.education || '',
        email:     member.email || '',
        phone:     member.phone || '',
        bio:       member.bio || '',
        image: req.files?.[`staffImage_${i}`]?.[0]
          ? req.files[`staffImage_${i}`][0].path
          : member.image || '',
      }));
    }

    const updateData = {
      name: name || existing.name,
      slug: name ? slugify(name) : existing.slug,
      about: about !== undefined ? about : existing.about,
      hod,
      staff,
      order: order !== undefined ? order : existing.order,
    };

    const updated = await AdministrationDept.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/admin-depts/:id/restore — restore from trash
router.patch('/:id/restore', async (req, res) => {
  try {
    await AdministrationDept.findByIdAndUpdate(req.params.id, { deletedAt: null });
    res.json({ message: 'Department restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin-depts/:id/permanent — hard delete
router.delete('/:id/permanent', async (req, res) => {
  try {
    await AdministrationDept.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin-depts/:id — soft delete (move to trash)
router.delete('/:id', async (req, res) => {
  try {
    await AdministrationDept.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Department moved to trash' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
