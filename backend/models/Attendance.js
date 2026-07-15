const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  registrationNo: { type: String, required: true },
  studentName:    { type: String, required: true },
  status:         { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], default: 'Absent' },
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
}, { timestamps: true });

// One session per class per date
AttendanceSchema.index({ ongoingClassId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
