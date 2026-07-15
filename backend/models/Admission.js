const mongoose = require('mongoose');

const AdmissionSchema = new mongoose.Schema(
  {
    department:      { type: String, required: true },
    program:         { type: String, required: true },
    secondPriority:  { type: String },
    thirdPriority:   { type: String },
    candidateName:   { type: String, required: true },
    fatherName:      { type: String, required: true },
    email:           { type: String, required: true },
    cnic:            { type: String, required: true },
    dob:             { type: String, required: true },
    gender:          { type: String, required: true },
    phone:           { type: String, required: true },
    whatsapp:        { type: String },
    nationality:     { type: String, required: true },
    city:            { type: String, required: true },
    currentAddress:  { type: String, required: true },
    permanentAddress:{ type: String, required: true },
    profilePicture:  { type: String },
    qualifications:  { type: String }, // JSON stringified rows
    status:          { type: String, default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', AdmissionSchema);
