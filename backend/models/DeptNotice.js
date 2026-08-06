const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  fileUrl:  { type: String, required: true },
  fileName: { type: String, default: '' },
}, { _id: false });

// audience narrows who sees the notice beyond the poster's own department:
// - departments: extra ObjectId restriction (rarely used — HOD notices are
//   always scoped to their own department via the `department` string
//   below; this exists for future cross-department notices).
// - programs / semesters: empty array = "no restriction" (everyone in the
//   department sees it); non-empty = student's programId/currentSemester
//   must be included.
// - roles: which portals may see it; empty or containing 'all' = everyone.
const AudienceSchema = new mongoose.Schema({
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  programs:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Program' }],
  semesters:   [{ type: Number, min: 1, max: 8 }],
  roles:       [{ type: String, enum: ['student', 'teacher', 'all'] }],
}, { _id: false });

const DeptNoticeSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true },
  body:       { type: String, default: '' },
  department: { type: String, required: true },
  postedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'HOD', required: true },
  postedByName: { type: String, default: '' },
  priority:   { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  isPublished:{ type: Boolean, default: true },
  // Notices are visible only when now is within [publishAt, expiresAt].
  // publishAt defaults to "now" (publish immediately); expiresAt of null
  // means "never expires".
  publishAt:  { type: Date, default: Date.now },
  expiresAt:  { type: Date, default: null },
  audience:   { type: AudienceSchema, default: () => ({}) },
  attachments: [AttachmentSchema],
}, { timestamps: true });

module.exports = mongoose.model('DeptNotice', DeptNoticeSchema);
