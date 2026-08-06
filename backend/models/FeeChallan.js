const mongoose = require('mongoose');

const FeeItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount:      { type: Number, required: true, min: 0 },
}, { _id: false });

const FeeChallanSchema = new mongoose.Schema({
  challanNo:           { type: String, unique: true, required: true },
  feeRecord:           { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord' },
  student:             { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  registrationNo:      { type: String, required: true },
  studentName:         { type: String, required: true },
  fatherName:          { type: String, default: '' },
  department:          { type: String, default: '' },
  departmentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  program:             { type: String, required: true },
  programId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  semester:            { type: String, required: true },
  semesterId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  academicSession:     { type: String, default: '' },
  sessionId:           { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
  feeStructure:        { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
  feeItems:            [FeeItemSchema],
  totalAmount:         { type: Number, required: true },
  dueDate:             Date,
  lateFeePerDay:       { type: Number, default: 0 },
  bankName:            { type: String, default: 'Habib Bank Limited (HBL)' },
  bankAccount:         { type: String, default: 'PK36HABB0002437900614201' },
  bankBranch:          { type: String, default: 'Panjgur Branch' },
  paymentInstructions: { type: String, default: 'Deposit the fee amount in the university bank account and submit the original deposit slip to the Finance Section within the due date.' },
  status:              { type: String, enum: ['generated','paid','expired','cancelled'], default: 'generated' },
  paidAt:              Date,
  // No default: an empty string would still satisfy the sparse index (sparse
  // only excludes documents where the field is undefined/missing), so an
  // unpaid challan must have paymentRef genuinely unset, not ''.
  paymentRef:          { type: String, unique: true, sparse: true },
  generatedBy:         mongoose.Schema.Types.ObjectId,
  issuedAt:            { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FeeChallan', FeeChallanSchema);
