const mongoose = require('mongoose');

// Each programme in a department has its own curriculum and its own fees — BS AI,
// BS CS and BS IT sit inside Computer Science but share none of it. These mirror
// the shapes used on Department so the two render identically; they are declared
// here rather than imported so a change to one can never silently alter the
// other.
const FeeRowSchema = new mongoose.Schema({
  description: String,
  fee:         String,
}, { _id: false });

const CourseRowSchema = new mongoose.Schema({
  courseTitle: String,
  creditHours: String,
  theoryLab:   String,
  code:        String,
}, { _id: false });

const SemesterSchema = new mongoose.Schema({
  title:   String,
  courses: [CourseRowSchema],
});

const CustomTableRowSchema = new mongoose.Schema({
  cells:     { type: [String], default: [] },
  label:     { type: String,  default: '' },
  highlight: { type: Boolean, default: false },
}, { _id: false });

const CustomTableSchema = new mongoose.Schema({
  title:       { type: String,  default: '' },
  showSerial:  { type: Boolean, default: true },
  serialLabel: { type: String,  default: 'S/N' },
  columns:     { type: [String], default: [] },
  rows:        { type: [CustomTableRowSchema], default: [] },
}, { _id: false });

const ProgramSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  category:         { type: String, enum: ['Science', 'Arts'], required: true },
  image:            { type: String, default: '' },
  duration:         { type: String, default: '' },
  semesters:        { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  // legacy / extended fields kept for backward compatibility
  description:        { type: String, default: '' },
  prerequisite:       { type: String, default: '' },
  degreeAwardDetails: { type: String, default: '' },
  specialization:     [String],
  level:              { type: String, enum: ['Undergraduate', 'Postgraduate'], default: 'Undergraduate' },

  // ── Tab: Course Content ──────────────────────────────────────────────
  courseHeading:     { type: String, default: '' },
  courseDescription: { type: String, default: '' },
  // Deliberately NOT `semesters` — that name is already taken above by the
  // plain count string ("8") shown in Program Details.
  courseSemesters:   { type: [SemesterSchema], default: [] },
  courseTables:      { type: [CustomTableSchema], default: [] },

  // ── Tab: Fee Structure ───────────────────────────────────────────────
  feeHeading:        { type: String, default: '' },
  feeDescription:    { type: String, default: '' },
  feeAdmissionTitle: { type: String, default: 'Admission Time Fee Structure' },
  feeAdmissionRows:  { type: [FeeRowSchema], default: [] },
  feeSemesterTitle:  { type: String, default: 'Per Semester Fee Structure' },
  feeSemesterRows:   { type: [FeeRowSchema], default: [] },

  department:         { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  departmentId:       mongoose.Schema.Types.ObjectId,
  deletedAt:          { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);
