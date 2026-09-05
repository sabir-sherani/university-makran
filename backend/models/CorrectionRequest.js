const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../validators/enums');

// type: 'result-sheet' is the original teacher -> hod/exam correction flow
// (resultSheet/teacher/requestedChanges required). 'student-profile' is a
// student requesting a change to an official record field (fullName, cnic,
// dateOfBirth, email) that only an admin can approve — see
// routes/studentPortal.js PATCH /profile. 'attendance' (Phase 5) is a student
// requesting a status change on one of their own Attendance session records,
// reviewed by the HOD only — see routes/studentPortal.js POST
// /attendance-corrections and routes/hodPortal.js PATCH /correction-requests/:id.
const FieldChangeSchema = new mongoose.Schema({
  field:    String,
  oldValue: String,
  newValue: String,
}, { _id: false });

const AttachmentSchema = new mongoose.Schema({
  fileUrl:    String,
  fileName:   String,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const CorrectionRequestSchema = new mongoose.Schema({
  type:             { type: String, enum: ['result-sheet', 'student-profile', 'attendance'], default: 'result-sheet' },

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

  // attendance fields (Phase 5) — student/studentRegistrationNo/studentName
  // above are reused; subject above is snapshotted from the Attendance
  // session for consistent list-view rendering across all three types.
  attendanceSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  timetableSlot:      { type: mongoose.Schema.Types.ObjectId, ref: 'TimetableSlot' },
  ongoingClassId:     { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingClass' },
  classDate:          Date,
  currentStatus:      { type: String, enum: ATTENDANCE_STATUS },
  requestedStatus:    { type: String, enum: ATTENDANCE_STATUS },
  attachments:        [AttachmentSchema],
  appliedAt:          Date, // set when an approved status change is written through to Attendance

  department:       { type: String, default: '' },
  reason:           { type: String, required: true },
  status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId },
  reviewerRole:     { type: String, enum: ['hod', 'exam', 'admin'] },
  reviewerComment:  { type: String, default: '' },
  reviewedAt:       Date,
}, { timestamps: true });

module.exports = mongoose.model('CorrectionRequest', CorrectionRequestSchema);
