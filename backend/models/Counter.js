const mongoose = require('mongoose');

// Generic atomic sequence counter (one document per named sequence, e.g.
// "challanNo-2026") used to generate collision-free human-readable ids
// without trusting client-supplied values or racy countDocuments() reads.
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', CounterSchema);
