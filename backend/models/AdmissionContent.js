const mongoose = require('mongoose');

const ScheduleItemSchema = new mongoose.Schema({
  date:  { type: String, required: true },
  event: { type: String, required: true },
  type:  { type: String, enum: ['start', 'info', 'deadline', 'end'], default: 'info' },
}, { _id: true });

const AdmissionContentSchema = new mongoose.Schema({
  eligibilityCriteria: {
    arts:    [{ type: String }],
    science: [{ type: String }],
  },
  requiredDocuments: [{ type: String }],
  schedule: [ScheduleItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('AdmissionContent', AdmissionContentSchema);
