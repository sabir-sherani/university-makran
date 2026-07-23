const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  photo:    String,
  name:     String,
  jobTitle: String,
  education:String,
  email:    String,
  phone:    String,
  bio:      String,
});

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

const DegreeProgramSchema = new mongoose.Schema({
  heading:     String,
  description: String,
});

const GalleryImageSchema = new mongoose.Schema({
  image:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
}, { _id: false });

const HodSchema = new mongoose.Schema({
  photo:              String,
  name:               String,
  qualification:      String,
  email:              String,
  descriptionHeading: String,
  description:        String,
}, { _id: false });

const DepartmentSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        String,
  bannerImage: String,

  // Tab 1 — About
  aboutHeading:     String,
  aboutDescription: String,

  // Tab 2 — HOD & Staff
  hod:   HodSchema,
  staff: [StaffSchema],

  // Tab 3 — Fee Structure
  feeAdmissionTitle: { type: String, default: 'Admission Time Fee Structure' },
  feeAdmissionRows:  [FeeRowSchema],
  feeSemesterTitle:  { type: String, default: 'Per Semester Fee Structure' },
  feeSemesterRows:   [FeeRowSchema],

  // Tab 4 — Mission & Vision
  missionHeading:     String,
  missionDescription: String,
  visionHeading:      String,
  visionDescription:  String,

  // Tab 5 — Course Content
  semesters: [SemesterSchema],

  // Tab 6 — Degree Programs
  degreePrograms: [DegreeProgramSchema],

  // Tab 7 — Facilities & Resources
  facilitiesResources: {
    heading:     { type: String, default: '' },
    description: { type: String, default: '' },
    images:      { type: [GalleryImageSchema], default: [] },
  },

  // Tab 8 — Student Engagement
  studentEngagement: {
    heading:     { type: String, default: '' },
    description: { type: String, default: '' },
    images:      { type: [GalleryImageSchema], default: [] },
  },

  // Legacy (kept for backward compat with search route)
  description: String,
  head:        String,
  facilities:  [String],
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

DepartmentSchema.index({ slug: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Department', DepartmentSchema);
