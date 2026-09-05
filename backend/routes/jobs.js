// Externally-triggered scheduled-job endpoint — see PART 2 §4.1 of
// prompts/phase-4.md. Deployment is serverless-ish, so there is no
// in-process cron; something outside the app (Vercel Cron / a Railway
// scheduled job / a GitHub Action) calls this once a day instead. See
// DEPLOYMENT.md "Scheduled jobs" for how to wire that up.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { jobsLimiter } = require('../middleware/rateLimiters');
const { runDailyJobs } = require('../jobs/dailyJobs');

// Hashing both sides to a fixed-length digest before crypto.timingSafeEqual()
// avoids the length check that function otherwise throws on (a raw header
// value and the configured secret are very unlikely to be the same length),
// while still comparing in constant time so response timing can't be used to
// guess JOB_SECRET one character at a time.
function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a || '')).digest();
  const hashB = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// POST /api/jobs/daily — header: x-job-secret: <JOB_SECRET>
router.post('/daily', jobsLimiter, async (req, res) => {
  try {
    const configured = process.env.JOB_SECRET;
    const provided = req.headers['x-job-secret'];
    if (!configured || !provided || !safeEqual(provided, configured)) {
      return res.status(401).json({ message: 'Unauthorized: missing or invalid x-job-secret header.' });
    }

    const summary = await runDailyJobs({ now: new Date() });
    res.json({ message: 'Daily jobs completed.', ranAt: new Date().toISOString(), ...summary });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
