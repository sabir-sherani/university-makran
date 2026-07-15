const express = require('express');
const router = express.Router();
const Scholarship = require('../models/Scholarship');

// GET all — sorted by serialNo
router.get('/', async (req, res) => {
  try {
    const docs = await Scholarship.find().sort({ serialNo: 1, createdAt: 1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { serialNo, name, eligibility, award } = req.body;
    let sn = serialNo;
    if (!sn) {
      const last = await Scholarship.findOne().sort({ serialNo: -1 });
      sn = last ? (last.serialNo || 0) + 1 : 1;
    }
    const doc = await Scholarship.create({ serialNo: sn, name, eligibility, award });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { serialNo, name, eligibility, award } = req.body;
    const doc = await Scholarship.findByIdAndUpdate(
      req.params.id,
      { serialNo, name, eligibility, award },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Scholarship.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
