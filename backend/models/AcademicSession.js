const mongoose = require('mongoose');

const AcademicSessionSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true }, // e.g. "2024-2028"
  startYear:  { type: String, default: '' },
  endYear:    { type: String, default: '' },
  program:    { type: String, default: '' },
  department: { type: String, default: '' },
  status:     { type: String, enum: ['upcoming', 'active', 'completed'], default: 'active' },
  isActive:   { type: Boolean, default: true },
  notes:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AcademicSession', AcademicSessionSchema);
