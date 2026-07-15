const mongoose = require('mongoose');

const StudentResultSchema = new mongoose.Schema({
  registrationNo: String,
  studentName: String,
  fatherName: String,
  obtainedGPA: Number,
  totalGPA: Number,
});

const ResultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: { type: String, enum: ['Mid', 'Final', 'Quiz'] },
  semester: String,
  department: String,
  program: String,
  session: String,
  timeSession: { type: String, enum: ['Morning', 'Evening'] },
  passingMarks: Number,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId },
  uploadedByRole: { type: String, enum: ['teacher', 'admin'] },
  isPublished: { type: Boolean, default: true },
  fileUrl: String,
  fileName: String,
  results: [StudentResultSchema],
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
