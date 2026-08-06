const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  registrationNo: { type: String, required: true },
  studentName:    { type: String, required: true },
  fatherName:     { type: String, default: '' },
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
