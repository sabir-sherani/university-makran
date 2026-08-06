const Counter = require('../models/Counter');

// Atomically increments and returns the next number in a named sequence.
// Safe under concurrency: MongoDB's findOneAndUpdate + $inc is a single
// atomic operation, so two simultaneous callers can never receive the same seq.
async function nextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

module.exports = { nextSequence };
