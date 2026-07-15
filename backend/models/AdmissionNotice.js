const mongoose = require('mongoose');

const AdmissionNoticeSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  date:        { type: Date, default: Date.now },
  lastDate:    { type: Date },
  image:       { type: String },
  pdf:         { type: String },
  link:        { type: String, trim: true },
  published:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('AdmissionNotice', AdmissionNoticeSchema);
