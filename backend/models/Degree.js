const mongoose = require('mongoose');

const DegreeSchema = new mongoose.Schema(
  {
    degreeId: { type: String, required: true, unique: true },
    studentName: String,
    program: String,
    degree: String,
    graduationDate: Date,
    verified: Boolean,
    institution: { type: String, default: 'University of Makran, Panjgur' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Degree', DegreeSchema);
