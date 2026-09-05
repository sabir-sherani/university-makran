const mongoose = require('mongoose');

// Canonical room/venue catalogue — replaces the free-text OngoingClass.room
// string as the thing the timetable actually schedules against. departmentId:
// null means the room is shared/university-wide (e.g. a common lecture
// theatre); a set departmentId means it belongs to that department only.
const RoomSchema = new mongoose.Schema({
  code: {
    type: String, required: true, uppercase: true, trim: true,
  },
  name: { type: String, required: true, trim: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  department: { type: String, default: '' },
  building: { type: String, default: '' },
  capacity: { type: Number, min: 1, default: 40 },
  type: { type: String, enum: ['classroom', 'lab', 'seminar'], default: 'classroom' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

RoomSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model('Room', RoomSchema);
