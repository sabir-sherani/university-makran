const mongoose = require('mongoose');

// One document per (departmentId, sessionId) — HOD-configurable policy knobs
// that used to be implicit/hard-coded (75% attendance threshold, etc). A
// missing document behaves as all-defaults (see getOrDefault() below) rather
// than an error, so nothing needs to pre-create these for every dept/session.
const WindowSchema = new mongoose.Schema({
  start: { type: String, default: '' }, // "HH:MM", 24h
  end:   { type: String, default: '' },
}, { _id: false });

const DeptSettingSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  department:   { type: String, default: '' },
  sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
  session:      { type: String, default: '' },

  minAttendancePercent: { type: Number, default: 75, min: 0, max: 100 },
  absenceAlertEnabled: { type: Boolean, default: true },
  // Absence alerts (Phase 3) always cover 'Absent'; this additionally covers
  // 'Late' when a department wants both flagged.
  alsoAlertOnLate: { type: Boolean, default: false },
  consecutiveAbsenceAlertThreshold: { type: Number, default: 3, min: 1 },
  // How many days a student has to file an attendance correction request
  // after being marked absent/late — quoted in the absence-alert email/body
  // (Phase 3) and enforced as the request window once correction requests
  // exist (Phase 5). One field, read by both.
  attendanceCorrectionWindowDays: { type: Number, default: 14, min: 1 },
  documentReminderHours: { type: Number, default: 48, min: 1 },
  // How many days after a DateSheet exam date a still-draft ResultSheet is
  // allowed before the daily job (jobs/dailyJobs.js) reminds the teacher.
  resultSheetGraceDays: { type: Number, default: 3, min: 0, max: 90 },
  workingDays: {
    type: [{ type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] }],
    default: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  },
  morningWindow: { type: WindowSchema, default: () => ({ start: '08:00', end: '12:00' }) },
  eveningWindow: { type: WindowSchema, default: () => ({ start: '14:00', end: '18:00' }) },
  slotGranularityMinutes: { type: Number, default: 30, min: 5, max: 120 },
}, { timestamps: true });

DeptSettingSchema.index({ departmentId: 1, sessionId: 1 }, { unique: true });

// Every field in the schema already carries its own default, so a brand new
// (never-saved) document IS the correct "defaults" shape — this just avoids
// every call site repeating the same findOne-or-build boilerplate.
DeptSettingSchema.statics.getOrDefault = async function getOrDefault(departmentId, sessionId) {
  const existing = await this.findOne({ departmentId, sessionId });
  if (existing) return existing;
  return new this({ departmentId, sessionId });
};

module.exports = mongoose.model('DeptSetting', DeptSettingSchema);
