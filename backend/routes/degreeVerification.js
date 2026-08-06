const express = require('express');
const router = express.Router();
const Degree = require('../models/Degree');

// Verify degree
router.post('/', async (req, res) => {
  try {
    const degree = await Degree.findOne({ degreeId: req.body.degreeId });
    if (!degree) {
      return res.status(404).json({ verified: false, message: 'Degree not found' });
    }
    res.json({
      verified: true,
      degree: degree.degree,
      program: degree.program,
      graduationDate: degree.graduationDate,
      institution: degree.institution,
      status: 'Valid'
    });
  } catch (error) {
    res.sendServerError(error);
  }
});

// Create degree record
router.post('/create', async (req, res) => {
  const degree = new Degree(req.body);
  try {
    const savedDegree = await degree.save();
    res.status(201).json(savedDegree);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
