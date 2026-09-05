const mongoose = require('mongoose');

const OngoingClassSchema = new mongoose.Schema({
  className:      { type: String, required: true },
  subject:        { type: String, required: true },
  // Optional link to the canonical course catalogue (models/Course.js) — when
  // set, subject/creditHours/isLab were snapshotted from it via snapshotRefs()
  // at assignment time. Legacy rows (and any class assigned by free-text
  // subject rather than a picked course) simply leave these null — subject
  // alone keeps working exactly as it always has.
  courseId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseCode:     { type: String, default: '' },
  creditHours:    { type: Number, default: null },
  isLab:          { type: Boolean, default: false },
  department:     { type: String, required: true },
  departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  program:        String,
  programId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  semester:       String,
  academicSession:String,
  sessionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
  timeSession:    { type: String, enum: ['Morning', 'Evening'] },
  teacher:        { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherName:    String,
  teacherId:      String,
  days:           [{ type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] }],
  startTime:      String,
  endTime:        String,
  room:           String,
  // Optional link to the canonical room catalogue (models/Room.js) — when
  // set, `room` was snapshotted from it via snapshotRefs(). Legacy rows (and
  // any class assigned by free-text room) simply leave this null.
  roomId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  location:       String,
  weeklyHours:    Number,
  maxStudents:    Number,
  status:         { type: String, enum: ['active','completed','cancelled','on-hold'], default: 'active' },
  createdBy:      { type: mongoose.Schema.Types.ObjectId },
  createdByRole:  { type: String, enum: ['admin','teacher','hod'] },
}, { timestamps: true });

module.exports = mongoose.model('OngoingClass', OngoingClassSchema);
