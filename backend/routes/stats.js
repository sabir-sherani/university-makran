const express = require('express');
const router  = express.Router();
const Program  = require('../models/Program');
const Contact  = require('../models/Contact');
const Feedback = require('../models/Feedback');
const Admission = require('../models/Admission');

// Reads a whole non-negative number from the environment, falling back if the
// variable is missing or nonsense, so a typo in .env can never put "NaN" on
// the homepage.
function figure(value, fallback) {
  // Number('') is 0, so an empty "STATS_STUDENTS=" line in .env would quietly
  // publish zero rather than falling back. Treat blank as absent.
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

// GET /api/stats — the public "at a glance" figures on the homepage and the
// About page.
//
// Students and faculty are deliberately NOT counted from the database. This
// portal holds only the accounts created inside it, which is a small fraction
// of the university's actual roll — counting them would understate the
// institution badly, and the number would lurch about as accounts are added.
//
// They come from the figures the university itself publishes, set in
// backend/.env so the registrar's office can have them corrected without a
// code change or a rebuild — edit the file and restart the backend:
//
//   STATS_STUDENTS=684
//   STATS_FACULTY=57
//   STATS_FACILITIES=12
//
// Programs stays live: that list is maintained in the admin panel, so the
// count there is real and worth showing.
router.get('/', async (req, res) => {
  try {
    const programs = await Program.countDocuments();
    res.json({
      students:   figure(process.env.STATS_STUDENTS,   684),
      faculty:    figure(process.env.STATS_FACULTY,     57),
      programs,
      facilities: figure(process.env.STATS_FACILITIES,  12),
    });
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/stats/notifications — unread counts for sidebar badges.
// These are genuine live counts and stay that way: they drive the admin's
// work queue, so they must reflect what is actually waiting.
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
