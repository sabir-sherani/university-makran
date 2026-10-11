const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const AdmissionBatch = require('../models/AdmissionBatch');
const Admission      = require('../models/Admission');
const { requiredString, validate } = require('../validators');
const { verifyAdminToken } = require('../middleware/auth');

// Only one batch may be open at a time, so applicants never have to choose one
// and "the current intake" is never ambiguous. Opening a batch closes the rest.
async function closeOthers(keepId) {
  const filter = { isOpen: true };
  if (keepId) filter._id = { $ne: keepId };
  await AdmissionBatch.updateMany(filter, { $set: { isOpen: false } });
}

function parseLastDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ── GET /api/admission-batches/open ── public ────────────────────────────────
// Drives the public admission page: either the batch now accepting, or enough
// detail to tell the visitor why the form is not available.
router.get('/open', async (req, res) => {
  try {
    const accepting = await AdmissionBatch.findAccepting();
    if (accepting) {
      return res.json({
        open: true,
        batch: { name: accepting.name, lastDate: accepting.lastDate, notes: accepting.notes },
      });
    }

    // Flagged open but the deadline has gone — say so rather than a bare "closed".
    const lapsed = await AdmissionBatch.findOpenFlagged();
    if (lapsed) {
      return res.json({
        open: false,
        reason: 'deadline_passed',
        batch: { name: lapsed.name, lastDate: lapsed.lastDate },
      });
    }

    res.json({ open: false, reason: 'no_batch' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── GET /api/admission-batches ── admin list ────────────────────────────────
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const batches = await AdmissionBatch.find().sort({ lastDate: -1 });

    // Application counts, so the admin can see a batch's size before touching it.
    const counts = await Admission.aggregate([
      { $match: { batchId: { $exists: true, $ne: null } } },
      { $group: { _id: '$batchId', n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

    res.json(batches.map((b) => ({ ...b.toJSON(), applications: byId[String(b._id)] || 0 })));
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── POST /api/admission-batches ─────────────────────────────────────────────
router.post('/', verifyAdminToken, [
  requiredString('name', { max: 40 }),
  body('lastDate').notEmpty().withMessage('lastDate is required.'),
  validate,
], async (req, res) => {
  try {
    const lastDate = parseLastDate(req.body.lastDate);
    if (!lastDate) return res.status(400).json({ message: 'lastDate is not a valid date.' });

    const isOpen = req.body.isOpen !== false && req.body.isOpen !== 'false';

    const batch = new AdmissionBatch({
      name:  String(req.body.name).trim(),
      lastDate,
      isOpen,
      notes: String(req.body.notes || '').trim(),
    });
    await batch.save();
    if (batch.isOpen) await closeOthers(batch._id);

    res.status(201).json(batch.toJSON());
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ message: 'A batch with that name already exists.' });
    res.status(400).json({ message: err.message });
  }
});

// ── PUT /api/admission-batches/:id ──────────────────────────────────────────
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const batch = await AdmissionBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found.' });

    if (req.body.name !== undefined) batch.name = String(req.body.name).trim();
    if (req.body.notes !== undefined) batch.notes = String(req.body.notes).trim();
    if (req.body.lastDate !== undefined) {
      const d = parseLastDate(req.body.lastDate);
      if (!d) return res.status(400).json({ message: 'lastDate is not a valid date.' });
      batch.lastDate = d;
    }
    if (req.body.isOpen !== undefined) {
      batch.isOpen = req.body.isOpen !== false && req.body.isOpen !== 'false';
    }

    await batch.save();
    if (batch.isOpen) await closeOthers(batch._id);

    res.json(batch.toJSON());
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ message: 'A batch with that name already exists.' });
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /api/admission-batches/:id ───────────────────────────────────────
// Refused once applications are attached: deleting the batch would orphan them
// and silently drop the rule that stops those applicants re-applying.
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const used = await Admission.countDocuments({ batchId: req.params.id });
    if (used > 0) {
      return res.status(409).json({
        message: `This batch has ${used} application${used === 1 ? '' : 's'} and cannot be deleted. Close it instead.`,
      });
    }
    const removed = await AdmissionBatch.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Batch not found.' });
    res.json({ message: 'Batch deleted.' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
