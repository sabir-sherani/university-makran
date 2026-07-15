const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
  name: { type: String, required: true },
  photo: String,
  designation: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
}, { timestamps: true });

module.exports = mongoose.model('Faculty', FacultySchema);
