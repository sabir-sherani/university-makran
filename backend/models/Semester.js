const mongoose = require('mongoose');

const SemesterSchema = new mongoose.Schema({
  name:            { type: String, required: true }, // e.g. "Semester 1"
  number:          { type: Number },                 // 1, 2, 3 ...
  program:         { type: String, default: '' },
  department:      { type: String, default: '' },
  academicSession: { type: String, default: '' },
  programId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  departmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  startDate:       { type: Date },
  endDate:         { type: Date },
  status:          { type: String, enum: ['upcoming', 'active', 'completed', 'archived'], default: 'active' },
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Semester', SemesterSchema);
