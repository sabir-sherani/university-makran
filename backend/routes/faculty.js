const express = require('express');
const router = express.Router();
const multer = require('multer');
const Faculty = require('../models/Faculty');
const { createStorage } = require('../utils/cloudinary');

const upload = multer({ storage: createStorage('faculty', ['jpg', 'jpeg', 'png', 'webp']) });

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
    if (req.file) data.photo = req.file.path;
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
    if (req.file) data.photo = req.file.path;
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
