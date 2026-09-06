const express = require('express');
const router  = express.Router();
const Student  = require('../models/Student');
const Teacher  = require('../models/Teacher');
const Program  = require('../models/Program');
const Contact  = require('../models/Contact');
const Feedback = require('../models/Feedback');
const Admission = require('../models/Admission');

// GET /api/stats — public homepage "at a glance" counts. Falls back to a
// placeholder only while the site has no real approved students/teachers
// yet — as soon as real ones exist, the real count takes over automatically.
router.get('/', async (req, res) => {
  try {
    const [students, faculty, programs] = await Promise.all([
      Student.countDocuments({ status: 'approved' }),
      Teacher.countDocuments({ status: 'approved' }),
      Program.countDocuments(),
    ]);
    res.json({
      students:     students || 684,
      faculty:      faculty  || 57,
      programs:     programs || 15,
      facilities:   12,
    });
  } catch (err) {
    res.sendServerError(err);
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
    res.sendServerError(err);
  }
});

module.exports = router;
