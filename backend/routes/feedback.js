const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const Feedback = require('../models/Feedback');

const { createStorage } = require('../utils/cloudinary');
const upload = multer({ storage: createStorage('feedback', ['jpg', 'jpeg', 'png', 'pdf']) });

// GET /api/feedback — newest first
router.get('/', async (req, res) => {
  try {
    const items = await Feedback.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/feedback/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Feedback.countDocuments({ read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/feedback
router.post('/', upload.single('attachment'), async (req, res) => {
  try {
    const { name, email, universityId, role, department, category, subject, feedback, rating } = req.body;
    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ message: 'Feedback message is required.' });
    }
    const attachmentUrl = req.file ? req.file.path : '';
    const item  = new Feedback({ name, email, universityId, role, department, category, subject, feedback, rating: rating ? Number(rating) : undefined, attachmentUrl });
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/feedback/:id — mark read/unread or update status
router.put('/:id', async (req, res) => {
  try {
    const item = await Feedback.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Feedback not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/feedback/:id
router.delete('/:id', async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
