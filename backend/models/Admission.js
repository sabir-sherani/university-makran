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

    // The intake this application belongs to. batchName is denormalised so the
    // admin list and any export can show it without a join, and so the record
    // still reads correctly if the batch is ever renamed.
    batchId:         { type: mongoose.Schema.Types.ObjectId, ref: 'AdmissionBatch' },
    batchName:       { type: String },
  },
  { timestamps: true }
);

// One application per person per batch, on any of the three identifiers.
//
// routes/admissions.js already checks for an existing application and returns a
// readable message; these indexes are the backstop for the case that check
// cannot cover — two submissions racing each other, where both read "no
// existing application" before either has written. There the second insert
// fails here instead of creating the duplicate.
//
// partialFilterExpression keeps them scoped to records that actually carry a
// batch. Applications submitted before batches existed have no batchId, so they
// are exempt — which is what lets these indexes be added to a database that
// already contains duplicates without the build failing.
const perBatch = { unique: true, partialFilterExpression: { batchId: { $exists: true } } };
AdmissionSchema.index({ batchId: 1, cnic: 1 },  perBatch);
AdmissionSchema.index({ batchId: 1, email: 1 }, perBatch);
AdmissionSchema.index({ batchId: 1, phone: 1 }, perBatch);

module.exports = mongoose.model('Admission', AdmissionSchema);
