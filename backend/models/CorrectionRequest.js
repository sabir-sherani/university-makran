const mongoose = require('mongoose');

// type: 'result-sheet' is the original teacher -> hod/exam correction flow
// (resultSheet/teacher/requestedChanges required). 'student-profile' is a
// student requesting a change to an official record field (fullName, cnic,
// dateOfBirth, email) that only an admin can approve — see
// routes/studentPortal.js PATCH /profile.
const FieldChangeSchema = new mongoose.Schema({
  field:    String,
  oldValue: String,
  newValue: String,
}, { _id: false });

const CorrectionRequestSchema = new mongoose.Schema({
  type:             { type: String, enum: ['result-sheet', 'student-profile'], default: 'result-sheet' },

  // result-sheet fields
  resultSheet:      { type: mongoose.Schema.Types.ObjectId, ref: 'ResultSheet' },
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherId:        { type: String, default: '' },
  teacherName:      { type: String, default: '' },
  subject:          { type: String, default: '' },
  semester:         { type: String, default: '' },
  examType:         { type: String, default: '' },
  requestedChanges: { type: String, default: '' },

  // student-profile fields
  student:               { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentRegistrationNo: { type: String, default: '' },
  studentName:            { type: String, default: '' },
  requestedFieldChanges:  [FieldChangeSchema],

  department:       { type: String, default: '' },
  reason:           { type: String, required: true },
  status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId },
  reviewerRole:     { type: String, enum: ['hod', 'exam', 'admin'] },
  reviewerComment:  { type: String, default: '' },
  reviewedAt:       Date,
}, { timestamps: true });

module.exports = mongoose.model('CorrectionRequest', CorrectionRequestSchema);
