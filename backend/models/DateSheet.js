const mongoose = require('mongoose');

const ExamScheduleSchema = new mongoose.Schema({
  subject: String,
  date: Date,
  startTime: String,
  endTime: String,
  room: String,
});

const DateSheetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  examType: { type: String, enum: ['Mid', 'Final', 'Quiz', 'Practical'] },
  semester: String,
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  department: String,
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  program: String,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  session: String,
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
  timeSession: { type: String, enum: ['Morning', 'Evening'] },
  fileUrl: String,
  fileName: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId },
  uploadedByRole: { type: String, enum: ['teacher', 'admin'] },
  isPublished: { type: Boolean, default: true },
  examSchedule: [ExamScheduleSchema],
}, { timestamps: true });

module.exports = mongoose.model('DateSheet', DateSheetSchema);
