const mongoose = require('mongoose');

const DesignationSchema = new mongoose.Schema({
  title:    { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Designation', DesignationSchema);
