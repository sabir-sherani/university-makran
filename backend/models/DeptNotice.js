const mongoose = require('mongoose');

const DeptNoticeSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  body:       { type: String, default: '' },
  department: { type: String, required: true },
  postedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'HOD', required: true },
  postedByName: { type: String, default: '' },
  priority:   { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  isPublished:{ type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('DeptNotice', DeptNoticeSchema);
