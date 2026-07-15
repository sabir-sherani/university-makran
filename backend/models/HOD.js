const mongoose = require('mongoose');

const HODSchema = new mongoose.Schema({
  hodId:      { type: String, unique: true, required: true },
  fullName:   { type: String, required: true },
  email:      { type: String, unique: true, required: true },
  password:   { type: String, required: true },
  phone:      String,
  cnic:       { type: String, unique: true, sparse: true },
  department: { type: String, required: true },
  designation:{ type: String, default: 'Head of Department' },
  qualification: String,
  status:     { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('HOD', HODSchema);
