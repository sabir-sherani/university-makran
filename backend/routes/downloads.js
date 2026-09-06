const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Download = require('../models/Download');
const { createUpload } = require('../utils/cloudinary');

// Admin uploads either an image or a PDF — never doc/docx here, matching the
// "image or PDF" scope this feature was asked for.
const upload = createUpload('downloads', ['jpg', 'jpeg', 'png', 'webp', 'pdf']);

// GET /api/downloads — public, published only, newest first
router.get('/', async (req, res) => {
  try {
    const items = await Download.find({ published: true }).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/downloads/all — admin, everything including unpublished
router.get('/all', async (req, res) => {
  try {
    const items = await Download.find().sort({ date: -1 });
    res.json(items);
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/downloads
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'A file (image or PDF) is required.' });
    const saved = await new Download({
      title: req.body.title,
      date: req.body.date || Date.now(),
      file: req.file.path,
      published: req.body.published !== 'false',
    }).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/downloads/:id
router.put('/:id', upload.single('file'), async (req, res) => {
  try {
    const existing = await Download.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const data = {
      title: req.body.title !== undefined ? req.body.title : existing.title,
      date: req.body.date || existing.date,
      published: req.body.published !== undefined ? req.body.published !== 'false' : existing.published,
      file: existing.file,
    };

    if (req.file) {
      const oldPath = path.join(__dirname, '../public', existing.file);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      data.file = req.file.path;
    }

    const updated = await Download.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/downloads/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Download.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    const filePath = path.join(__dirname, '../public', item.file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await Download.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
