const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdministrationDept = require('../models/AdministrationDept');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `admin-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only jpg/jpeg/png/webp images are allowed'));
  },
});

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Dynamic upload: hodImage + up to 20 staff images
const adminUpload = upload.fields([
  { name: 'hodImage', maxCount: 1 },
  ...Array.from({ length: 20 }, (_, i) => ({ name: `staffImage_${i}`, maxCount: 1 })),
]);

// GET /api/admin-depts — list all (lightweight for header/listing)
router.get('/', async (req, res) => {
  try {
    const depts = await AdministrationDept.find()
      .select('name slug about hod order')
      .sort({ order: 1, name: 1 });
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
      ? `/uploads/${req.files.hodImage[0].filename}`
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
          ? `/uploads/${req.files[`staffImage_${i}`][0].filename}`
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
      ? `/uploads/${req.files.hodImage[0].filename}`
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
          ? `/uploads/${req.files[`staffImage_${i}`][0].filename}`
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

// DELETE /api/admin-depts/:id
router.delete('/:id', async (req, res) => {
  try {
    await AdministrationDept.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
