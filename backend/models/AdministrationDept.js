const mongoose = require('mongoose');

const StaffMemberSchema = new mongoose.Schema({
  image:     { type: String, default: '' },
  name:      { type: String, required: true, trim: true },
  jobTitle:  { type: String, trim: true, default: '' },
  education: { type: String, trim: true, default: '' },
  email:     { type: String, trim: true, default: '' },
  phone:     { type: String, trim: true, default: '' },
  bio:       { type: String, default: '' },
}, { _id: true });

const HodSchema = new mongoose.Schema({
  image:          { type: String, default: '' },
  name:           { type: String, trim: true },
  position:       { type: String, trim: true, default: '' },
  specialization: { type: String, trim: true },
  about:          { type: String, trim: true },
  message:        { type: String, default: '' },
}, { _id: false });

const AdministrationDeptSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, trim: true },
  about: { type: String, trim: true },
  hod: { type: HodSchema, default: {} },
  staff: { type: [StaffMemberSchema], default: [] },
  order: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

AdministrationDeptSchema.index({ slug: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('AdministrationDept', AdministrationDeptSchema);
