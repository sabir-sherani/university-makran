const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    password: { type: String, required: true },
    designation: String,
    department: String,
    courses: [String],
    status: { type: String, default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', EmployeeSchema);
