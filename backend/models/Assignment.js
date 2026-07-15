const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  description:    String,
  ongoingClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'OngoingClass', default: null },
  subject:        { type: String, default: '' },
  className:      { type: String, default: '' },
  department:     { type: String, default: '' },
  program:        { type: String, default: '' },
  semester:       { type: String, default: '' },
  academicSession:{ type: String, default: '' },
  dueDate:        Date,
  fileUrl:        String,
  fileName:       String,
  uploadedBy:     { type: mongoose.Schema.Types.ObjectId },
  uploadedByRole: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  totalMarks:     { type: Number, default: 100 },
  isPublished:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
