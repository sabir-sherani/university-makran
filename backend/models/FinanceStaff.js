const mongoose = require('mongoose');
const { CNIC_REGEX, PHONE_REGEX, NAME_REGEX, FINANCE_ID_REGEX } = require('../validators/fields');
const { STAFF_STATUS } = require('../validators/enums');
const accountSecurityFields = require('./accountSecurityFields');

const FinanceStaffSchema = new mongoose.Schema({
  financeId:  {
    type: String, unique: true, required: true, trim: true, uppercase: true,
    match: [FINANCE_ID_REGEX, 'financeId must be in the format FIN-XXXX.'],
  },
  fullName:   {
    type: String, required: true, trim: true, minlength: 3, maxlength: 60,
    match: [NAME_REGEX, 'fullName may only contain letters, spaces, dots, and hyphens.'],
  },
  email:      { type: String, unique: true, required: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  phone:      { type: String, match: [PHONE_REGEX, 'phone must be a valid Pakistani mobile number.'] },
  cnic:       { type: String, unique: true, sparse: true, match: [CNIC_REGEX, 'cnic must be in the format 12345-1234567-1.'] },
  designation:{ type: String, default: 'Finance Officer' },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  department: String,
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  status:     { type: String, enum: STAFF_STATUS, default: 'active' },
  ...accountSecurityFields,
}, { timestamps: true });

module.exports = mongoose.model('FinanceStaff', FinanceStaffSchema);
