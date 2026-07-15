const mongoose = require('mongoose');

const ScholarshipSchema = new mongoose.Schema({
  serialNo:   { type: Number },
  name:       { type: String, required: true },
  eligibility:{ type: String, default: '' },
  award:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Scholarship', ScholarshipSchema);
