const mongoose = require('mongoose');
const { CNIC_REGEX, PHONE_REGEX, NAME_REGEX, MIN_AGE_YEARS, MAX_AGE_YEARS } = require('../validators/fields');
const { GENDER, ADMISSION_STATUS } = require('../validators/enums');

const dobValidator = {
  validator(v) {
    if (v == null || v === '') return true;
    const d = new Date(v);
    if (isNaN(d.getTime()) || d >= new Date()) return false;
    const age = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return age >= MIN_AGE_YEARS && age <= MAX_AGE_YEARS;
  },
  message: `dob must be a valid past date implying an age between ${MIN_AGE_YEARS} and ${MAX_AGE_YEARS} years.`,
};

const AdmissionSchema = new mongoose.Schema(
  {
    department:      { type: String, required: true },
    program:         { type: String, required: true },
    secondPriority:  { type: String },
    thirdPriority:   { type: String },
    candidateName:   {
      type: String, required: true, trim: true, minlength: 3, maxlength: 60,
      match: [NAME_REGEX, 'candidateName may only contain letters, spaces, dots, and hyphens.'],
    },
    fatherName:      {
      type: String, required: true, trim: true, minlength: 3, maxlength: 60,
      match: [NAME_REGEX, 'fatherName may only contain letters, spaces, dots, and hyphens.'],
    },
    email:           { type: String, required: true, lowercase: true, trim: true },
    cnic:            { type: String, required: true, match: [CNIC_REGEX, 'cnic must be in the format 12345-1234567-1.'] },
    dob:             { type: String, required: true, validate: dobValidator },
    gender:          { type: String, required: true, enum: GENDER },
    phone:           { type: String, required: true, match: [PHONE_REGEX, 'phone must be a valid Pakistani mobile number.'] },
    whatsapp:        { type: String, match: [PHONE_REGEX, 'whatsapp must be a valid Pakistani mobile number.'] },
    nationality:     { type: String, required: true },
    city:            { type: String, required: true },
    currentAddress:  { type: String, required: true },
    permanentAddress:{ type: String, required: true },
    profilePicture:  { type: String },
    qualifications:  { type: String }, // JSON stringified rows
    status:          { type: String, enum: ADMISSION_STATUS, default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', AdmissionSchema);
