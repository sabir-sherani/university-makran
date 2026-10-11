const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const Program  = require('../models/Program');

// ── Upload setup ─────────────────────────────────────────────────────────────

const { createUpload } = require('../utils/cloudinary');

// createUpload's shared fileFilter already requires BOTH extension and MIME
// type to match (stricter than this route's old OR-based check).
const upload = createUpload('programs', ['jpg', 'jpeg', 'png', 'webp']).single('image');

function runUpload(req, res) {
  return new Promise((resolve, reject) =>
    upload(req, res, (err) => (err ? reject(err) : resolve()))
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseJson(str, fallback = []) {
  try {
    const v = JSON.parse(str);
    return v === null || v === undefined ? fallback : v;
  } catch { return fallback; }
}

// Admin-built tables arrive as free JSON. Pin them down before storing:
// strings only, every row squared off to the column count (a ragged row breaks
// the table layout on the public page), and finite caps so a malformed payload
// cannot store an enormous document.
function sanitizeTables(raw) {
  if (!Array.isArray(raw)) return [];
  const text = (v) => (v === undefined || v === null ? '' : String(v)).slice(0, 300);
  return raw.slice(0, 20).map((t) => {
    const columns = (Array.isArray(t?.columns) ? t.columns : []).slice(0, 12).map(text);
    const rows = (Array.isArray(t?.rows) ? t.rows : []).slice(0, 200).map((r) => {
      const cells = (Array.isArray(r?.cells) ? r.cells : []).slice(0, columns.length).map(text);
      while (cells.length < columns.length) cells.push('');
      return { cells, label: text(r?.label), highlight: Boolean(r?.highlight) };
    });
    return {
      title:       text(t?.title),
      showSerial:  t?.showSerial !== false,
      serialLabel: text(t?.serialLabel) || 'S/N',
      columns,
      rows,
    };
  });
}

function sanitizeSemesters(raw) {
  if (!Array.isArray(raw)) return [];
  const text = (v) => (v === undefined || v === null ? '' : String(v)).slice(0, 200);
  return raw.slice(0, 20).map((sem) => ({
    title: text(sem?.title),
    courses: (Array.isArray(sem?.courses) ? sem.courses : []).slice(0, 100).map((c) => ({
      courseTitle: text(c?.courseTitle),
      creditHours: text(c?.creditHours),
      theoryLab:   text(c?.theoryLab),
      code:        text(c?.code),
    })),
  }));
}

function sanitizeFeeRows(raw) {
  if (!Array.isArray(raw)) return [];
  const text = (v) => (v === undefined || v === null ? '' : String(v)).slice(0, 200);
  return raw.slice(0, 100).map((r) => ({ description: text(r?.description), fee: text(r?.fee) }));
}

function buildData(body, file, existing = {}) {
  const data = {};
  if (body.title            !== undefined) data.title            = body.title;
  if (body.category         !== undefined) data.category         = body.category;
  if (body.duration         !== undefined) data.duration         = body.duration;
  if (body.semesters        !== undefined) data.semesters        = body.semesters;
  if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
  if (body.description      !== undefined) data.description      = body.description;
  if (body.level            !== undefined) data.level            = body.level;
  if (body.department       !== undefined) data.department       = body.department || null;

  // ── Course Content ────────────────────────────────────────────────────
  if (body.courseHeading     !== undefined) data.courseHeading     = body.courseHeading;
  if (body.courseDescription !== undefined) data.courseDescription = body.courseDescription;
  // Each of these is only written when the client actually sends it, so a
  // partial update from anywhere else cannot wipe a programme's curriculum.
  if (body.courseSemestersJson !== undefined)
    data.courseSemesters = sanitizeSemesters(parseJson(body.courseSemestersJson, []));
  if (body.courseTablesJson !== undefined)
    data.courseTables = sanitizeTables(parseJson(body.courseTablesJson, []));

  // ── Fee Structure ─────────────────────────────────────────────────────
  if (body.feeHeading        !== undefined) data.feeHeading        = body.feeHeading;
  if (body.feeDescription    !== undefined) data.feeDescription    = body.feeDescription;
  if (body.feeAdmissionTitle !== undefined) data.feeAdmissionTitle = body.feeAdmissionTitle;
  if (body.feeSemesterTitle  !== undefined) data.feeSemesterTitle  = body.feeSemesterTitle;
  if (body.feeAdmissionRowsJson !== undefined)
    data.feeAdmissionRows = sanitizeFeeRows(parseJson(body.feeAdmissionRowsJson, []));
  if (body.feeSemesterRowsJson !== undefined)
    data.feeSemesterRows = sanitizeFeeRows(parseJson(body.feeSemesterRowsJson, []));

  if (file) {
    data.image = file.path;
  } else if (body.existingImage !== undefined) {
    data.image = body.existingImage;
  }

  return data;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/programs?category=Science|Arts (active only)
router.get('/', async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.department) filter.department = req.query.department;
    const programs = await Program.find(filter)
      .populate('department', 'name slug')
      .sort({ createdAt: -1 });
    res.json(programs);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/programs/trash
router.get('/trash', async (req, res) => {
  try {
    const programs = await Program.find({ deletedAt: { $ne: null } })
      .select('title category duration deletedAt')
      .sort({ deletedAt: -1 });
    res.json(programs);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/programs/:id
router.get('/:id', async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).populate('department', 'name slug');
    if (!program) return res.status(404).json({ message: 'Program not found' });
    res.json(program);
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/programs  (multipart/form-data)
router.post('/', async (req, res) => {
  try {
    await runUpload(req, res);
    if (!req.body.title)    return res.status(400).json({ message: 'Title is required' });
    if (!req.body.category) return res.status(400).json({ message: 'Category is required' });
    const data    = buildData(req.body, req.file);
    const program = new Program(data);
    const saved   = await program.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/programs/:id  (multipart/form-data)
router.put('/:id', async (req, res) => {
  try {
    await runUpload(req, res);
    const existing = await Program.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Program not found' });
    const data    = buildData(req.body, req.file, existing);
    const updated = await Program.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/programs/:id/restore
router.patch('/:id/restore', async (req, res) => {
  try {
    await Program.findByIdAndUpdate(req.params.id, { deletedAt: null });
    res.json({ message: 'Program restored' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// DELETE /api/programs/:id/permanent
router.delete('/:id/permanent', async (req, res) => {
  try {
    await Program.findByIdAndDelete(req.params.id);
    res.json({ message: 'Program permanently deleted' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// DELETE /api/programs/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    await Program.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Program moved to trash' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
