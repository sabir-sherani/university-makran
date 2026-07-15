const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  teacherId: { type: String, unique: true, required: true },
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  cnic: { type: String, unique: true, sparse: true },
  department: String,
  qualification: String,
  designation: String,
  classesTaught: [String],
  weeklyHours: Number,
  ongoingClasses: [{
    subjectName: { type: String, required: true },
    department: String,
    program: String,
    semester: String,
    timeSession: { type: String, enum: ['Morning', 'Evening'] },
    academicSession: String,
    weeklyHours: Number,
  }],
  teachingAssignments: [{
    department: String,
    session: { type: String, enum: ['Morning', 'Evening'] },
    weeklyHours: Number,
    academicSession: String,
  }],
  teachingFields: [{
    subject: { type: String, required: true },
    program: String,
    department: String,
    description: String,
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', TeacherSchema);
