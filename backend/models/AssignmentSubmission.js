const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  registrationNo: String,
  studentName: String,
  fileUrl: String,
  fileName: String,
  note:          String,
  obtainedMarks: { type: Number, default: null },
  feedback:      { type: String, default: '' },
  gradedAt:      { type: Date, default: null },
}, { timestamps: true });

SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', SubmissionSchema);
