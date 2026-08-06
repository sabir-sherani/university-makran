const mongoose = require('mongoose');
const { CNIC_REGEX, PHONE_REGEX, NAME_REGEX, EXAM_ID_REGEX } = require('../validators/fields');
const { STAFF_STATUS } = require('../validators/enums');
const accountSecurityFields = require('./accountSecurityFields');

const ExaminationStaffSchema = new mongoose.Schema({
  examId:     {
    type: String, unique: true, required: true, trim: true, uppercase: true,
    match: [EXAM_ID_REGEX, 'examId must be in the format EXAM-XXXX.'],
  },
  fullName:   {
    type: String, required: true, trim: true, minlength: 3, maxlength: 60,
    match: [NAME_REGEX, 'fullName may only contain letters, spaces, dots, and hyphens.'],
  },
  email:      { type: String, unique: true, required: true, lowercase: true, trim: true },
  password:   { type: String, required: true },
  phone:      { type: String, match: [PHONE_REGEX, 'phone must be a valid Pakistani mobile number.'] },
  cnic:       { type: String, unique: true, sparse: true, match: [CNIC_REGEX, 'cnic must be in the format 12345-1234567-1.'] },
  designation:{ type: String, default: 'Examination Staff' },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  section:    String,
  status:     { type: String, enum: STAFF_STATUS, default: 'active' },
  ...accountSecurityFields,
}, { timestamps: true });

module.exports = mongoose.model('ExaminationStaff', ExaminationStaffSchema);
