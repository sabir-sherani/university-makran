const mongoose = require('mongoose');

const FeeItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
}, { _id: false });

const FeeStructureSchema = new mongoose.Schema({
  program:         { type: String, required: true },
  department:      { type: String, default: '' },
  semester:        { type: String, required: true },
  academicSession: { type: String, default: '' },
  feeItems:        [FeeItemSchema],
  totalAmount:     { type: Number, required: true, min: 0 },
  dueDate:         Date,
  lateFeePerDay:   { type: Number, default: 0 },
  isActive:        { type: Boolean, default: true },
  createdBy:       mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
