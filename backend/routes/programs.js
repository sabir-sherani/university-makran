const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const Program  = require('../models/Program');

// ── Upload setup ─────────────────────────────────────────────────────────────

const { createStorage } = require('../utils/cloudinary');

const upload = multer({
  storage: createStorage('programs', ['jpg', 'jpeg', 'png', 'webp']),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExts  = /\.(jpg|jpeg|png|webp)$/i;
    if (allowedMimes.includes(file.mimetype) || allowedExts.test(file.originalname))
      cb(null, true);
    else
      cb(new Error('Only jpg/jpeg/png/webp images are allowed'));
  },
}).single('image');

function runUpload(req, res) {
  return new Promise((resolve, reject) =>
    upload(req, res, (err) => (err ? reject(err) : resolve()))
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildData(body, file, existing = {}) {
  const data = {};
  if (body.title            !== undefined) data.title            = body.title;
  if (body.category         !== undefined) data.category         = body.category;
  if (body.duration         !== undefined) data.duration         = body.duration;
  if (body.semesters        !== undefined) data.semesters        = body.semesters;
  if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
  if (body.description      !== undefined) data.description      = body.description;
  if (body.level            !== undefined) data.level            = body.level;
  if (body.department       !== undefined) data.department       = body.department || null;

  if (file) {
    data.image = file.path;
  } else if (body.existingImage !== undefined) {
    data.image = body.existingImage;
  }

  return data;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/programs?category=Science|Arts (active only)
router.get('/', async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.department) filter.department = req.query.department;
    const programs = await Program.find(filter)
      .populate('department', 'name slug')
      .sort({ createdAt: -1 });
    res.json(programs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/programs/trash
router.get('/trash', async (req, res) => {
  try {
    const programs = await Program.find({ deletedAt: { $ne: null } })
      .select('title category duration deletedAt')
      .sort({ deletedAt: -1 });
    res.json(programs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/programs/:id
router.get('/:id', async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).populate('department', 'name slug');
    if (!program) return res.status(404).json({ message: 'Program not found' });
    res.json(program);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/programs  (multipart/form-data)
router.post('/', async (req, res) => {
  try {
    await runUpload(req, res);
    if (!req.body.title)    return res.status(400).json({ message: 'Title is required' });
    if (!req.body.category) return res.status(400).json({ message: 'Category is required' });
    const data    = buildData(req.body, req.file);
    const program = new Program(data);
    const saved   = await program.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/programs/:id  (multipart/form-data)
router.put('/:id', async (req, res) => {
  try {
    await runUpload(req, res);
    const existing = await Program.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Program not found' });
    const data    = buildData(req.body, req.file, existing);
    const updated = await Program.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/programs/:id/restore
router.patch('/:id/restore', async (req, res) => {
  try {
    await Program.findByIdAndUpdate(req.params.id, { deletedAt: null });
    res.json({ message: 'Program restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/programs/:id/permanent
router.delete('/:id/permanent', async (req, res) => {
  try {
    await Program.findByIdAndDelete(req.params.id);
    res.json({ message: 'Program permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/programs/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    await Program.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Program moved to trash' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
