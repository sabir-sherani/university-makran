const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Admission = require('../models/Admission');

const { createStorage } = require('../utils/cloudinary');
const upload = multer({ storage: createStorage('admissions', ['jpg', 'jpeg', 'png']) });

// GET all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Admission.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create application (multipart — profile picture optional)
router.post('/apply', upload.single('profilePicture'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.profilePicture = req.file.path;
    const saved = await new Admission(data).save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST bulk delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'ids array is required' });
    const result = await Admission.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${result.deletedCount} application(s)` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update status
router.put('/:id', async (req, res) => {
  try {
    const application = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(application);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE single application
router.delete('/:id', async (req, res) => {
  try {
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Application deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
