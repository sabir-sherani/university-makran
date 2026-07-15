const mongoose = require('mongoose');

const FinanceStaffSchema = new mongoose.Schema({
  financeId:  { type: String, unique: true, required: true },
  fullName:   { type: String, required: true },
  email:      { type: String, unique: true, required: true },
  password:   { type: String, required: true },
  phone:      String,
  cnic:       { type: String, unique: true, sparse: true },
  designation:{ type: String, default: 'Finance Officer' },
  department: String,
  status:     { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('FinanceStaff', FinanceStaffSchema);
