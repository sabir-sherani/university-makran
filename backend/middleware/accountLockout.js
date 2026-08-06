// Per-account lockout: 5 failed logins locks the account for 15 minutes,
// independent of (and in addition to) the per-IP rate limiter — this stops
// a single account being brute-forced from many different IPs.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function isLocked(user) {
  return !!(user.lockUntil && user.lockUntil.getTime() > Date.now());
}

function lockRemainingMinutes(user) {
  if (!isLocked(user)) return 0;
  return Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
}

async function recordFailedAttempt(user) {
  user.failedAttempts = (user.failedAttempts || 0) + 1;
  if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    user.failedAttempts = 0; // fresh count for the next window once unlocked
  }
  await user.save();
}

async function resetFailedAttempts(user) {
  if (user.failedAttempts || user.lockUntil) {
    user.failedAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
}

module.exports = {
  isLocked,
  lockRemainingMinutes,
  recordFailedAttempt,
  resetFailedAttempts,
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
};
