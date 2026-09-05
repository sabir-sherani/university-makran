const mongoose = require('mongoose');

// One document per (departmentId, creditHours, isLab) combination — the data-
// driven replacement for hard-coding "3 credit hours = 2x90min" somewhere in
// application code. departmentId: null means a university-wide default,
// consulted whenever a department has no override of its own for that
// (creditHours, isLab) pair. See utils/creditHours.js for the single
// requiredSessionsFor() function every part of the app must call instead of
// re-deriving this rule.
const PolicySessionSchema = new mongoose.Schema({
  kind: { type: String, enum: ['theory', 'lab'], required: true },
  durationMinutes: { type: Number, required: true, min: 15, max: 240 },
  count: { type: Number, required: true, min: 1, max: 10 },
}, { _id: false });

const CreditHourPolicySchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  department: { type: String, default: '' },
  creditHours: { type: Number, required: true, min: 1, max: 6 },
  isLab: { type: Boolean, default: false },
  sessions: { type: [PolicySessionSchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// null departmentId can't participate in a normal unique index the way an
// ObjectId can (Mongo treats every null as distinct unless the index is
// sparse over a field that's never null-by-design here) — so university-wide
// defaults and department overrides are kept unique via this partial index
// instead of relying on the tuple alone.
CreditHourPolicySchema.index(
  { departmentId: 1, creditHours: 1, isLab: 1 },
  { unique: true, partialFilterExpression: { departmentId: { $type: 'objectId' } } },
);
CreditHourPolicySchema.index(
  { creditHours: 1, isLab: 1 },
  { unique: true, partialFilterExpression: { departmentId: null } },
);

module.exports = mongoose.model('CreditHourPolicy', CreditHourPolicySchema);
