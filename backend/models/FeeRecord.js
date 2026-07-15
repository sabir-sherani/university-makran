const mongoose = require('mongoose');

const FeeItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
}, { _id: false });

const FeeRecordSchema = new mongoose.Schema({
  student:         { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  registrationNo:  { type: String, required: true },
  studentName:     { type: String, required: true },
  fatherName:      { type: String, default: '' },
  department:      { type: String, default: '' },
  program:         { type: String, default: '' },
  semester:        { type: String, default: '' },
  academicSession: { type: String, default: '' },
  feeStructure:    { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
  feeItems:        [FeeItemSchema],
  totalAmount:     { type: Number, required: true, min: 0 },
  paidAmount:      { type: Number, default: 0 },
  status:          { type: String, enum: ['unpaid','partial','paid','overdue','waived'], default: 'unpaid' },
  dueDate:         Date,
  paidAt:          Date,
  paymentMethod:   { type: String, default: '' },
  transactionRef:  { type: String, default: '' },
  remarks:         { type: String, default: '' },
  updatedBy:       mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('FeeRecord', FeeRecordSchema);
