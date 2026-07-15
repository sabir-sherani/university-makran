const mongoose = require('mongoose');

const CorrectionRequestSchema = new mongoose.Schema({
  resultSheet:      { type: mongoose.Schema.Types.ObjectId, ref: 'ResultSheet', required: true },
  teacher:          { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacherId:        { type: String, default: '' },
  teacherName:      { type: String, default: '' },
  subject:          { type: String, default: '' },
  department:       { type: String, default: '' },
  semester:         { type: String, default: '' },
  examType:         { type: String, default: '' },
  reason:           { type: String, required: true },
  requestedChanges: { type: String, required: true },
  status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:       { type: mongoose.Schema.Types.ObjectId },
  reviewerRole:     { type: String, enum: ['hod', 'exam'] },
  reviewerComment:  { type: String, default: '' },
  reviewedAt:       Date,
}, { timestamps: true });

module.exports = mongoose.model('CorrectionRequest', CorrectionRequestSchema);
