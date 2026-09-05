const mongoose = require('mongoose');

// One document per weekly recurring session — a 3CR course therefore has
// exactly two TimetableSlot documents, a 4CR lab course three (see
// utils/creditHours.js requiredSessionsFor(), the single source of truth for
// how many sessions a course needs). Clash detection (utils/timetableClash.js)
// and auto-suggest (utils/timetableSuggest.js) both operate on these documents.
const TimetableSlotSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  department:   { type: String, default: '' },
  programId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  program:      { type: String, default: '' },
  sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession', required: true },
  academicSession: { type: String, default: '' },
  semesterNumber: { type: Number, required: true, min: 1, max: 8 },
  timeSession:  { type: String, enum: ['Morning', 'Evening'], required: true },
  // Computed: `${programId}:${semesterNumber}:${timeSession}` — identifies
  // "the class" whose students can't be scheduled in two places at once.
  sectionKey:   { type: String, required: true },

  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseCode:   { type: String, default: '' },
  subject:      { type: String, default: '' },

  ongoingClass: { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingClass', required: true },
  teacher:      { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacherName:  { type: String, default: '' },
  teacherId:    { type: String, default: '' },

  roomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  room:         { type: String, default: '' },

  kind:         { type: String, enum: ['theory', 'lab'], required: true },
  day:          { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
  startTime:    { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be in 24h HH:mm format.'] },
  endTime:      { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'endTime must be in 24h HH:mm format.'] },
  durationMinutes: { type: Number, required: true, min: 15, max: 240 },

  status:       { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId },
  createdByRole:{ type: String, enum: ['admin', 'teacher', 'hod'] },
}, { timestamps: true });

// Computed from programId/semesterNumber/timeSession so callers never have to
// remember the exact format — set it explicitly and this is a no-op.
TimetableSlotSchema.pre('validate', function computeSectionKey(next) {
  if (this.programId && this.semesterNumber && this.timeSession) {
    this.sectionKey = `${this.programId}:${this.semesterNumber}:${this.timeSession}`;
  }
  next();
});

TimetableSlotSchema.index({ teacher: 1, day: 1, startTime: 1 });
TimetableSlotSchema.index({ roomId: 1, day: 1, startTime: 1 });
TimetableSlotSchema.index({ sectionKey: 1, day: 1, startTime: 1 });
TimetableSlotSchema.index({ ongoingClass: 1 });

module.exports = mongoose.model('TimetableSlot', TimetableSlotSchema);
