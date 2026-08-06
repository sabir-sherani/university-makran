const mongoose = require('mongoose');

const FeeItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
}, { _id: false });

const FeeStructureSchema = new mongoose.Schema({
  program:         { type: String, required: true },
  programId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  department:      { type: String, default: '' },
  departmentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  semester:        { type: String, required: true },
  semesterId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  academicSession: { type: String, default: '' },
  sessionId:       { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
  feeItems:        [FeeItemSchema],
  totalAmount:     { type: Number, required: true, min: 0 },
  dueDate:         Date,
  lateFeePerDay:   { type: Number, default: 0 },
  isActive:        { type: Boolean, default: true },
  createdBy:       mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
