const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  registrationNo: { type: String, unique: true, required: true },
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  cnic: { type: String, unique: true, sparse: true },
  fatherName: String,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: Date,
  address: String,
  department: String,
  program: String,
  session: String,
  timeSession: { type: String, enum: ['Morning', 'Evening'] },
  rollNo:               { type: String, default: '' },
  currentSemester:      { type: Number, default: 1 },
  enrolledCourses:      [String],
  cgpa:                 { type: Number, min: 0, max: 4 },
  attendancePercentage: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
