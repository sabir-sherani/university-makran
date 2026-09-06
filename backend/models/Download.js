const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  date:      { type: Date, default: Date.now },
  file:      { type: String, required: true }, // image or PDF — Cloudinary URL, or /uploads/... local fallback
  published: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Download', DownloadSchema);
