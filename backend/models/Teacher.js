const mongoose = require('mongoose');
const { CNIC_REGEX, PHONE_REGEX, NAME_REGEX, TEACHER_ID_REGEX } = require('../validators/fields');
const { TIME_SESSION, TEACHER_STATUS } = require('../validators/enums');
const accountSecurityFields = require('./accountSecurityFields');

const TeacherSchema = new mongoose.Schema({
  teacherId: {
    type: String, unique: true, required: true, trim: true, uppercase: true,
    match: [TEACHER_ID_REGEX, 'teacherId must be in the format TCH-XXXX.'],
  },
  fullName: {
    type: String, required: true, trim: true, minlength: 3, maxlength: 60,
    match: [NAME_REGEX, 'fullName may only contain letters, spaces, dots, and hyphens.'],
  },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, match: [PHONE_REGEX, 'phone must be a valid Pakistani mobile number.'] },
  cnic: { type: String, unique: true, sparse: true, match: [CNIC_REGEX, 'cnic must be in the format 12345-1234567-1.'] },
  department: String,
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  qualification: String,
  designation: String,
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  classesTaught: [String],
  weeklyHours: Number,
  ongoingClasses: [{
    subjectName: { type: String, required: true },
    department: String,
    program: String,
    semester: String,
    timeSession: { type: String, enum: TIME_SESSION },
    academicSession: String,
    weeklyHours: Number,
  }],
  teachingAssignments: [{
    department: String,
    session: { type: String, enum: TIME_SESSION },
    weeklyHours: Number,
    academicSession: String,
  }],
  teachingFields: [{
    subject: { type: String, required: true },
    program: String,
    department: String,
    description: String,
  }],
  status: { type: String, enum: TEACHER_STATUS, default: 'pending' },
  ...accountSecurityFields,
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
