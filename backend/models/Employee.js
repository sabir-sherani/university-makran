const mongoose = require('mongoose');
const { PHONE_REGEX, NAME_REGEX, EMP_ID_REGEX } = require('../validators/fields');
const { EMPLOYEE_STATUS } = require('../validators/enums');
const accountSecurityFields = require('./accountSecurityFields');

const EmployeeSchema = new mongoose.Schema(
  {
    empId: {
      type: String, required: true, unique: true, trim: true, uppercase: true,
      match: [EMP_ID_REGEX, 'empId must be in the format EMP-XXXX.'],
    },
    name: {
      type: String, required: true, trim: true, minlength: 3, maxlength: 60,
      match: [NAME_REGEX, 'name may only contain letters, spaces, dots, and hyphens.'],
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, match: [PHONE_REGEX, 'phone must be a valid Pakistani mobile number.'] },
    password: { type: String, required: true },
    designation: String,
    department: String,
    courses: [String],
    status: { type: String, enum: EMPLOYEE_STATUS, default: 'active' },
    ...accountSecurityFields,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', EmployeeSchema);
