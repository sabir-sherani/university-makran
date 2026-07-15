const express = require('express');
const router = express.Router();
const Facility = require('../models/Facility');

// GET all — sorted by serialNo
router.get('/', async (req, res) => {
  try {
    const facilities = await Facility.find().sort({ serialNo: 1, createdAt: 1 });
    res.json(facilities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: 'Not found' });
    res.json(facility);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const { serialNo, facility, description, purpose } = req.body;
    let sn = serialNo;
    if (!sn) {
      const last = await Facility.findOne().sort({ serialNo: -1 });
      sn = last ? (last.serialNo || 0) + 1 : 1;
    }
    const doc = await Facility.create({ serialNo: sn, facility, description, purpose });
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const { serialNo, facility, description, purpose } = req.body;
    const doc = await Facility.findByIdAndUpdate(
      req.params.id,
      { serialNo, facility, description, purpose },
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
    await Facility.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
