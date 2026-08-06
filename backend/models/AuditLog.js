const mongoose = require('mongoose');

// Append-only record of who did what to which record. Written via
// utils/audit.js — never edited or deleted through the API.
const AuditLogSchema = new mongoose.Schema({
  actorId:     { type: mongoose.Schema.Types.ObjectId },
  actorRole:   { type: String },
  actorName:   { type: String },
  action:      { type: String, required: true },   // e.g. 'student.approve', 'challan.generate'
  entityType:  { type: String, required: true },    // e.g. 'Student', 'FeeChallan'
  entityId:    { type: mongoose.Schema.Types.ObjectId },
  entityLabel: { type: String, default: '' },        // human-readable label snapshot (name/regNo/challanNo/...)
  before:      { type: mongoose.Schema.Types.Mixed }, // sanitized pre-change snapshot/diff (never passwords)
  after:       { type: mongoose.Schema.Types.Mixed }, // sanitized post-change snapshot/diff (never passwords)
  ip:          { type: String, default: '' },
  userAgent:   { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
