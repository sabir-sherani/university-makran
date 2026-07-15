const mongoose = require('mongoose');

const ExaminationStaffSchema = new mongoose.Schema({
  examId:     { type: String, unique: true, required: true },
  fullName:   { type: String, required: true },
  email:      { type: String, unique: true, required: true },
  password:   { type: String, required: true },
  phone:      String,
  cnic:       { type: String, unique: true, sparse: true },
  designation:{ type: String, default: 'Examination Staff' },
  section:    String,
  status:     { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('ExaminationStaff', ExaminationStaffSchema);
