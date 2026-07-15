const mongoose = require('mongoose');

const TeacherIdSlotSchema = new mongoose.Schema({
  teacherId: { type: String, unique: true, required: true },
  isUsed: { type: Boolean, default: false },
  usedBy: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TeacherIdSlot', TeacherIdSlotSchema);
