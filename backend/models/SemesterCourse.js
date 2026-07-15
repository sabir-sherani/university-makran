const mongoose = require('mongoose');

const CourseItemSchema = new mongoose.Schema({
  sNo: Number,
  courseTitle: String,
  creditHours: Number,
  theoryLab: String,
  code: String,
}, { _id: false });

const SemesterCourseSchema = new mongoose.Schema({
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  semesterNumber: { type: Number, required: true, min: 1, max: 8 },
  courses: [CourseItemSchema],
}, { timestamps: true });

SemesterCourseSchema.index({ program: 1, semesterNumber: 1 }, { unique: true });

module.exports = mongoose.model('SemesterCourse', SemesterCourseSchema);
