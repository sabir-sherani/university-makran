const mongoose = require('mongoose');
const { REGISTRATION_NO_REGEX, CNIC_REGEX, PHONE_REGEX, NAME_REGEX, MIN_AGE_YEARS, MAX_AGE_YEARS } = require('../validators/fields');
const { GENDER, TIME_SESSION, STUDENT_STATUS } = require('../validators/enums');
const accountSecurityFields = require('./accountSecurityFields');

const StudentSchema = new mongoose.Schema({
  registrationNo: {
    type: String, unique: true, required: true, uppercase: true, trim: true,
    match: [REGISTRATION_NO_REGEX, 'registrationNo must be in the format UOM-YYYY-NNNN.'],
  },
  fullName: {
    type: String, required: true, trim: true, minlength: 3, maxlength: 60,
    match: [NAME_REGEX, 'fullName may only contain letters, spaces, dots, and hyphens.'],
  },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, match: [PHONE_REGEX, 'phone must be a valid Pakistani mobile number.'] },
  cnic: { type: String, unique: true, sparse: true, match: [CNIC_REGEX, 'cnic must be in the format 12345-1234567-1.'] },
  fatherName: {
    type: String, trim: true, minlength: 3, maxlength: 60,
    match: [NAME_REGEX, 'fatherName may only contain letters, spaces, dots, and hyphens.'],
  },
  gender: { type: String, enum: GENDER },
  dateOfBirth: {
    type: Date,
    validate: {
      validator(v) {
        if (v == null) return true;
        if (v >= new Date()) return false;
        const age = (Date.now() - v.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= MIN_AGE_YEARS && age <= MAX_AGE_YEARS;
      },
      message: `dateOfBirth must be in the past and imply an age between ${MIN_AGE_YEARS} and ${MAX_AGE_YEARS} years.`,
    },
  },
  address: String,
  department: String,
  program: String,
  session: String,
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  programId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
  timeSession: { type: String, enum: TIME_SESSION },
  rollNo:               { type: String, default: '' },
  currentSemester:      { type: Number, default: 1 },
  enrolledCourses:      [String],
  cgpa:                 { type: Number, min: 0, max: 4 },
  attendancePercentage: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
  ...accountSecurityFields,
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
