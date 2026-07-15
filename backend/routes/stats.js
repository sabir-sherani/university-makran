const express = require('express');
const router  = express.Router();
const Student  = require('../models/Student');
const Employee = require('../models/Employee');
const Program  = require('../models/Program');
const Contact  = require('../models/Contact');
const Feedback = require('../models/Feedback');
const Admission = require('../models/Admission');

// GET /api/stats — dashboard summary counts
router.get('/', async (req, res) => {
  try {
    const [students, faculty, programs] = await Promise.all([
      Student.countDocuments(),
      Employee.countDocuments(),
      Program.countDocuments(),
    ]);
    res.json({
      students:     students || 5000,
      faculty:      faculty  || 250,
      programs:     programs || 15,
      facilities:   12,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/stats/notifications — unread counts for sidebar badges
router.get('/notifications', async (req, res) => {
  try {
    const [messages, applications, feedback] = await Promise.all([
      Contact.countDocuments({ read: false }),
      Admission.countDocuments({ status: 'pending' }),
      Feedback.countDocuments({ read: false }),
    ]);
    res.json({ messages, applications, feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
