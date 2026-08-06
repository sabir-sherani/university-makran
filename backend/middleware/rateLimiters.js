const rateLimit = require('express-rate-limit');

// Shared across every login/register/forgot-password/reset-password endpoint
// in every portal — 10 attempts per IP per 15 minutes. This is the per-IP
// backstop; middleware/accountLockout.js adds a per-account lockout on top
// of it so a single account can't be brute-forced from many IPs either.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
