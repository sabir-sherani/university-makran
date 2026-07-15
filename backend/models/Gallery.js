const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
  title:       { type: String, trim: true },
  description: { type: String, trim: true },
  category:    { type: String, trim: true, default: 'General' },
  image:       { type: String, required: true },
  order:       { type: Number, default: 0 },
  published:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Gallery', GallerySchema);
