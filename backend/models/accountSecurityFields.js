const mongoose = require('mongoose');

// Shared schema fragment spread into every login-capable model (Student,
// Teacher, HOD, ExaminationStaff, FinanceStaff, Admin, Employee).
//   failedAttempts / lockUntil     — per-account lockout (see middleware/accountLockout.js)
//   tokenVersion                   — bumped on password change or status change so
//                                     every previously-issued JWT for this account
//                                     stops working (checked in middleware/auth.js)
//   isActive / archivedAt / archivedBy — soft delete. Archived accounts cannot
//                                     log in (checked in middleware/auth.js and
//                                     every login route) and are excluded from
//                                     default admin list queries.
module.exports = {
  failedAttempts: { type: Number, default: 0 },
  lockUntil:      { type: Date, default: null },
  tokenVersion:   { type: Number, default: 0 },
  isActive:       { type: Boolean, default: true },
  archivedAt:     { type: Date, default: null },
  archivedBy:     { type: mongoose.Schema.Types.ObjectId, default: null },
};
