const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  linkType: {
    type: String,
    enum: ['external', 'internal', 'document'],
    default: 'external',
  },
  linkUrl: { type: String, trim: true },
  document: { type: String },
  image:    { type: String },
  published:       { type: Boolean, default: true },
  featuredInHero:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('News', NewsSchema);
