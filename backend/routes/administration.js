const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Get all staff
router.get('/staff', async (req, res) => {
  try {
    const staff = await Employee.find({ designation: { $in: ['Vice Chancellor', 'Registrar', 'Finance Director', 'Dean of Students'] } });
    res.json(staff);
  } catch (error) {
    res.sendServerError(error);
  }
});

module.exports = router;
