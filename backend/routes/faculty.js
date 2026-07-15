const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Faculty = require('../models/Faculty');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `faculty-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
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

// GET /api/faculty?department=id
router.get('/', async (req, res) => {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    const faculty = await Faculty.find(filter).populate('department', 'name slug');
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/faculty
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.photo = `/uploads/${req.file.filename}`;
    const member = new Faculty(data);
    const saved = await member.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/faculty/:id
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.photo = `/uploads/${req.file.filename}`;
    const member = await Faculty.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/faculty/:id
router.delete('/:id', async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ message: 'Faculty member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
