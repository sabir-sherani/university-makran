const mongoose = require('mongoose');

// Canonical per-program, per-semester course record — the thing OngoingClass.subject
// used to be a free-text guess at. Migrated from SemesterCourse.courses[] (see
// scripts/migrateSemesterCoursesToCourses.js); SemesterCourse itself stays the
// source of truth for admin's Courses page and the public department pages, this
// is the normalized copy everything else (HOD assignment, timetable, transcript)
// links to by ObjectId instead of retyping the title.
const CourseSchema = new mongoose.Schema({
  code: {
    type: String, required: true, uppercase: true, trim: true,
  },
  title: { type: String, required: true, trim: true },
  creditHours: { type: Number, min: 1, max: 6, default: 3 },
  // Derived from SemesterCourse's free-text theoryLab ("3+0" -> false,
  // "2+1" -> true) at migration/sync time — see parseIsLab() in the
  // migration script and in routes/courses.js's sync-forward write path.
  isLab: { type: Boolean, default: false },
  program: { type: String, default: '' },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  department: { type: String, default: '' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  semesterNumber: { type: Number, required: true, min: 1, max: 8 },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

CourseSchema.index({ programId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Course', CourseSchema);
