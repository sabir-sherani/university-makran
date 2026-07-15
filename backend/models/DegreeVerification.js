const mongoose = require('mongoose');

const DegreeVerificationSchema = new mongoose.Schema({
  registrationNo:  { type: String, required: true, unique: true },
  fullName:        { type: String, required: true },
  fatherName:      { type: String, default: '' },
  department:      { type: String, required: true },
  program:         { type: String, required: true },
  session:         { type: String, default: '' },
  graduationYear:  { type: String, default: '' },
  cgpa:            { type: String, default: '' },
  degreeStatus:    { type: String, enum: ['completed', 'in-progress', 'withdrawn'], default: 'completed' },
  remarks:         { type: String, default: '' },
  issuedBy:        { type: mongoose.Schema.Types.ObjectId },
  issuedByRole:    { type: String, default: 'exam' },
}, { timestamps: true });

module.exports = mongoose.model('DegreeVerification', DegreeVerificationSchema);
