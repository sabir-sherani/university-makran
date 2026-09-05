const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  registrationNo: { type: String, required: true },
  studentName:    { type: String, required: true },
  fatherName:     { type: String, default: '' },
  // Optional component breakdown — when a sheet uses markComponents (see
  // below), these are populated and obtainedMarks is their sum; sheets that
  // don't use the breakdown just leave these null and set obtainedMarks
  // directly, exactly as before. Which fields apply depends on hasLab:
  // lab subjects use sessionalMarks+labMarks+midMarks+finalMarks; non-lab
  // subjects break "sessional" into quizMarks+presentationMarks+assignmentMarks
  // instead (plus midMarks+finalMarks).
  sessionalMarks:    { type: Number, default: null },
  labMarks:          { type: Number, default: null },
  quizMarks:         { type: Number, default: null },
  presentationMarks: { type: Number, default: null },
  assignmentMarks:   { type: Number, default: null },
  midMarks:          { type: Number, default: null },
  finalMarks:        { type: Number, default: null },
  obtainedMarks:  { type: Number, required: true, min: 0, max: 100 },
  gpa:            { type: Number, default: 0 },
  grade:          { type: String, default: '' },
  remarks:        { type: String, default: '' },
  resultStatus:   { type: String, enum: ['Pending', 'Pass', 'Fail', 'Absent', 'Withheld'], default: 'Pending' },
});

const ResultSheetSchema = new mongoose.Schema({
  teacher:         { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacherId:       { type: String, required: true },
  teacherName:     { type: String, default: '' },
  ongoingClassId:  { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingClass' },
  subject:         { type: String, required: true },
  department:      { type: String, default: '' },
  departmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  program:         { type: String, default: '' },
  programId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  semester:        { type: String, default: '' },
  academicSession: { type: String, default: '' },
  sessionId:       { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
  examType:        { type: String, enum: ['Mid', 'Final', 'Quiz', 'Sessional'], default: 'Final' },
  totalMarks:      { type: Number, default: 100 },
  passingMarks:    { type: Number },
  // Whether this subject has a lab component — determines whether entries
  // carry labMarks and whether the Lab column shows in the UI / template.
  hasLab:          { type: Boolean, default: false },
  // Max marks per component; only meaningful when the sheet uses the
  // breakdown (i.e. was created/edited via the component-entry UI or an
  // Excel import). Must sum to totalMarks — enforced at the route level.
  // hasLab selects which subset applies (sessionalMax+labMax, or
  // quizMax+presentationMax+assignmentMax) — see EntrySchema comment above.
  markComponents:  {
    sessionalMax:    { type: Number, default: null },
    labMax:          { type: Number, default: null },
    quizMax:         { type: Number, default: null },
    presentationMax: { type: Number, default: null },
    assignmentMax:   { type: Number, default: null },
    midMax:          { type: Number, default: null },
    finalMax:        { type: Number, default: null },
  },
  status:          { type: String, enum: ['draft', 'submitted', 'finalized'], default: 'draft' },
  entries:         [EntrySchema],
  submittedAt:     Date,
  finalizedAt:     Date,
  // Set when exam-section sends a submitted sheet back to the teacher for
  // correction instead of finalizing it — cleared again once resubmitted.
  returnedRemarks: { type: String, default: '' },
  returnedAt:      Date,
}, { timestamps: true });

module.exports = mongoose.model('ResultSheet', ResultSheetSchema);
