const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../validators/enums');

const RecordSchema = new mongoose.Schema({
  registrationNo: { type: String, required: true },
  studentName:    { type: String, required: true },
  status:         { type: String, enum: ATTENDANCE_STATUS, default: 'Absent' },
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
  teacher:        { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  ongoingClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingClass', required: true },
  subject:        { type: String, default: '' },
  className:      { type: String, default: '' },
  department:     { type: String, default: '' },
  program:        { type: String, default: '' },
  semester:       { type: String, default: '' },
  date:           { type: Date, required: true },
  records:        [RecordSchema],
  // Make-up class support (Phase 3) — all optional/defaulted so existing rows
  // and consumers keep working unchanged.
  timetableSlot:  { type: mongoose.Schema.Types.ObjectId, ref: 'TimetableSlot' },
  isMakeup:       { type: Boolean, default: false },
  makeupFor:      { type: Date }, // the missed class date this session replaces
  makeupReason:   { type: String, default: '', maxlength: 500 },
  kind:           { type: String, enum: ['theory', 'lab'], default: 'theory' },
}, { timestamps: true });

// One regular session per class per date, but a make-up session may share a
// date with a regular one for the same class (e.g. the class ran as usual in
// the morning and a make-up for an earlier miss runs the same afternoon) — the
// isMakeup key means a duplicate can only collide within the same bucket, so
// two REGULAR sessions (or two make-up sessions) on one date still can't both
// exist. See scripts/fixAttendanceIndex.js for the migration off the old
// 2-field index.
AttendanceSchema.index({ ongoingClassId: 1, date: 1, isMakeup: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
