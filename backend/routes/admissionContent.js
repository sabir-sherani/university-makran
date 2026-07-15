const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const AdmissionNotice = require('../models/AdmissionNotice');

// ── File upload setup ────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `adm-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(pdf|jpg|jpeg|png|webp)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF and images are allowed'));
  },
});

// ═══════════════════════════════════════════════════════════════════
// NOTICES — CRUD
// ═══════════════════════════════════════════════════════════════════

// GET /api/admission-content/notices/all  (admin — all including drafts)
router.get('/notices/all', async (req, res) => {
  try {
    const notices = await AdmissionNotice.find().sort({ date: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admission-content/notices  (public — published only)
router.get('/notices', async (req, res) => {
  try {
    const notices = await AdmissionNotice.find({ published: true }).sort({ date: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admission-content/notices
router.post('/notices', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf',   maxCount: 1 },
]), async (req, res) => {
  try {
    const data = {
      title:       req.body.title,
      description: req.body.description || '',
      date:        req.body.date        || Date.now(),
      lastDate:    req.body.lastDate    || null,
      link:        req.body.link        || '',
      published:   req.body.published !== 'false',
    };
    if (req.files?.image?.[0]) data.image = `/uploads/${req.files.image[0].filename}`;
    if (req.files?.pdf?.[0])   data.pdf   = `/uploads/${req.files.pdf[0].filename}`;

    const saved = await new AdmissionNotice(data).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/admission-content/notices/:id
router.put('/notices/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf',   maxCount: 1 },
]), async (req, res) => {
  try {
    const existing = await AdmissionNotice.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Notice not found' });

    const data = {
      title:       req.body.title       ?? existing.title,
      description: req.body.description ?? existing.description,
      date:        req.body.date        ?? existing.date,
      lastDate:    req.body.lastDate !== undefined ? (req.body.lastDate || null) : existing.lastDate,
      link:        req.body.link        ?? existing.link,
      published:   req.body.published !== undefined
                     ? req.body.published !== 'false'
                     : existing.published,
      image: existing.image,
      pdf:   existing.pdf,
    };
    if (req.files?.image?.[0]) data.image = `/uploads/${req.files.image[0].filename}`;
    if (req.files?.pdf?.[0])   data.pdf   = `/uploads/${req.files.pdf[0].filename}`;

    const updated = await AdmissionNotice.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/admission-content/notices/:id
router.delete('/notices/:id', async (req, res) => {
  try {
    await AdmissionNotice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
