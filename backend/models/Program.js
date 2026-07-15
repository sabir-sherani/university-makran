const mongoose = require('mongoose');

const ProgramSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  category:         { type: String, enum: ['Science', 'Arts'], required: true },
  image:            { type: String, default: '' },
  duration:         { type: String, default: '' },
  semesters:        { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  // legacy / extended fields kept for backward compatibility
  description:        { type: String, default: '' },
  prerequisite:       { type: String, default: '' },
  degreeAwardDetails: { type: String, default: '' },
  specialization:     [String],
  level:              { type: String, enum: ['Undergraduate', 'Postgraduate'], default: 'Undergraduate' },
  department:         { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  departmentId:       mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);
