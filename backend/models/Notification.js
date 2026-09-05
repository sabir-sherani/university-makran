const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientRole: { type: String, enum: ['student', 'teacher', 'hod', 'exam', 'admin', 'finance'], required: true },
  recipient:     { type: mongoose.Schema.Types.ObjectId, required: true },
  category:      { type: String, enum: ['attendance', 'document', 'approval', 'timetable', 'result', 'notice', 'system'], required: true },
  title:         { type: String, required: true },
  body:          { type: String, default: '' },
  entityType:    { type: String, default: '' },
  entityId:      { type: mongoose.Schema.Types.ObjectId, default: null },
  link:          { type: String, default: '' },
  priority:      { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  isRead:        { type: Boolean, default: false },
  readAt:        { type: Date, default: null },
  emailSent:     { type: Boolean, default: false },
  emailError:    { type: String, default: '' },
  // What stops a daily cron from re-notifying the same person about the same
  // thing every run — e.g. `absence:<attendanceId>:<registrationNo>` or
  // `docReminder:<slotId>:<yyyy-mm-dd>`. Sparse so most one-off notifications
  // (which have no natural dedupe key) don't collide on a shared null value.
  dedupeKey:     { type: String, default: undefined },
}, { timestamps: true });

NotificationSchema.index({ recipientRole: 1, recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Notification', NotificationSchema);
