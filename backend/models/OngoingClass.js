const mongoose = require('mongoose');

const OngoingClassSchema = new mongoose.Schema({
  className:      { type: String, required: true },
  subject:        { type: String, required: true },
  department:     { type: String, required: true },
  program:        String,
  semester:       String,
  academicSession:String,
  timeSession:    { type: String, enum: ['Morning', 'Evening'] },
  teacher:        { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherName:    String,
  teacherId:      String,
  days:           [{ type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] }],
  startTime:      String,
  endTime:        String,
  room:           String,
  location:       String,
  weeklyHours:    Number,
  maxStudents:    Number,
  status:         { type: String, enum: ['active','completed','cancelled','on-hold'], default: 'active' },
  createdBy:      { type: mongoose.Schema.Types.ObjectId },
  createdByRole:  { type: String, enum: ['admin','teacher'] },
}, { timestamps: true });

module.exports = mongoose.model('OngoingClass', OngoingClassSchema);
