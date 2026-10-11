const mongoose = require('mongoose');

/**
 * An admission intake — "2027", say — with the date applications close.
 *
 * Deliberately separate from AcademicSession: a session is a per-department,
 * per-programme record that enrolled students, fee challans and date sheets all
 * hang off. A batch is a single university-wide window for *applicants*, who do
 * not have a department yet. Folding the two together would tie the admission
 * deadline to records that outlive it by four years.
 *
 * Only one batch is open at a time (enforced in routes/admissionBatches.js), so
 * applicants never pick one — whichever is open is stamped on their form.
 */
const AdmissionBatchSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, maxlength: 40 },
    // The last day applications are accepted, inclusive — see acceptingNow().
    lastDate: { type: Date, required: true },
    isOpen:   { type: Boolean, default: true },
    notes:    { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

AdmissionBatchSchema.index({ name: 1 }, { unique: true });

// The deadline is the END of lastDate, not midnight at its start: an admin who
// sets "31 December" means applications close when that day is over, not 24
// hours earlier.
function endOfDay(d) {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

AdmissionBatchSchema.methods.deadline = function deadline() {
  return endOfDay(this.lastDate);
};

AdmissionBatchSchema.methods.acceptingNow = function acceptingNow() {
  return this.isOpen && Date.now() <= endOfDay(this.lastDate).getTime();
};

/**
 * The batch that is currently taking applications, or null.
 *
 * Returns a batch only if it is both flagged open AND still inside its deadline,
 * so a passed deadline closes admissions on its own without anyone having to
 * remember to flip the switch.
 */
AdmissionBatchSchema.statics.findAccepting = async function findAccepting() {
  const batches = await this.find({ isOpen: true }).sort({ lastDate: -1 });
  return batches.find((b) => b.acceptingNow()) || null;
};

/** The open batch regardless of deadline — used to explain *why* it is closed. */
AdmissionBatchSchema.statics.findOpenFlagged = function findOpenFlagged() {
  return this.findOne({ isOpen: true }).sort({ lastDate: -1 });
};

AdmissionBatchSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    ret.accepting = doc.acceptingNow();
    return ret;
  },
});

module.exports = mongoose.model('AdmissionBatch', AdmissionBatchSchema);
