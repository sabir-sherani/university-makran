const mongoose = require('mongoose');
const { TEACHER_ID_REGEX } = require('../validators/fields');

const TeacherIdSlotSchema = new mongoose.Schema({
  teacherId: {
    type: String, unique: true, required: true, trim: true, uppercase: true,
    match: [TEACHER_ID_REGEX, 'teacherId must be in the format TCH-XXXX.'],
  },
  isUsed: { type: Boolean, default: false },
  usedBy: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TeacherIdSlot', TeacherIdSlotSchema);
