const mongoose = require('mongoose');

const FacilitySchema = new mongoose.Schema({
  serialNo:    { type: Number },
  facility:    { type: String, required: true },
  description: { type: String, default: '' },
  purpose:     { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Facility', FacilitySchema);
