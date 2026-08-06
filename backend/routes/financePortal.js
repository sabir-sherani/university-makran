const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const FinanceStaff = require('../models/FinanceStaff');
const Student = require('../models/Student');
const { verifyFinanceToken } = require('../middleware/auth');
const { requiredString, optionalString, numberInRange, nonEmptyArray, mongoId, enumField, validate, resolveRef, refFilters, departmentRef, programRef, semesterRef, sessionRef, snapshotRefs } = require('../validators');
const { escapeRegex } = require('../utils/escapeRegex');
const { isDuplicateKeyError, duplicateKeyMessage } = require('../utils/duplicateKey');
const { authLimiter } = require('../middleware/rateLimiters');
const { isLocked, lockRemainingMinutes, recordFailedAttempt, resetFailedAttempts } = require('../middleware/accountLockout');
const { logAudit } = require('../utils/audit');

const FEE_RECORD_STATUS = ['unpaid', 'partial', 'paid', 'overdue', 'waived'];
const FEE_CHALLAN_STATUS = ['generated', 'paid', 'expired', 'cancelled'];
// State machine: only 'generated' challans may transition, and only to one
// of these three terminal states. Once paid/expired/cancelled, no further
// status change is accepted (in particular, a challan can never be re-paid).
const CHALLAN_TRANSITIONS = { generated: ['paid', 'expired', 'cancelled'] };

// POST /api/portal/finance/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const financeId = String(req.body.financeId || '').trim().toUpperCase();
    const staff = await FinanceStaff.findOne({ financeId });
    if (!staff) return res.status(401).json({ message: 'Invalid credentials.' });

    if (staff.isActive === false) return res.status(403).json({ message: 'This account has been archived. Contact admin.' });

    if (isLocked(staff)) {
      return res.status(423).json({ message: `Account locked due to too many failed attempts. Try again in ${lockRemainingMinutes(staff)} minute(s).` });
    }

    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) {
      await recordFailedAttempt(staff);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    await resetFailedAttempts(staff);

    if (staff.status === 'inactive') return res.status(403).json({ message: 'Your account is inactive. Contact admin.' });

    const token = jwt.sign(
      { id: staff._id, role: 'finance', financeId: staff.financeId, tokenVersion: staff.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    const staffData = staff.toObject();
    delete staffData.password;
    res.json({ token, staff: staffData });
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/finance/profile
router.get('/profile', verifyFinanceToken, async (req, res) => {
  try {
    const staff = await FinanceStaff.findById(req.user.id).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });
    res.json(staff);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/finance/stats
router.get('/stats', verifyFinanceToken, async (req, res) => {
  try {
    const [total, approved, pending, suspended] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'approved' }),
      Student.countDocuments({ status: 'pending' }),
      Student.countDocuments({ status: 'suspended' }),
    ]);
    res.json({ total, approved, pending, suspended });
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/portal/finance/students  — view enrolled students for fee records
router.get('/students', verifyFinanceToken, async (req, res) => {
  try {
    const { department, program, status, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (program)    filter.program = program;
    if (status)     filter.status = status;
    if (search)     filter.$or = [
      { fullName:       { $regex: escapeRegex(search), $options: 'i' } },
      { registrationNo: { $regex: escapeRegex(search), $options: 'i' } },
      { email:          { $regex: escapeRegex(search), $options: 'i' } },
    ];
    const students = await Student.find(filter)
      .select('registrationNo fullName email phone department program currentSemester session status createdAt')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.sendServerError(err);
  }
});

// ── Fee Management ──────────────────────────────────────────────────────────────
const FeeStructure = require('../models/FeeStructure');
const FeeRecord    = require('../models/FeeRecord');
const FeeChallan   = require('../models/FeeChallan');

const { nextSequence } = require('../utils/nextSequence');

// Atomic per-year sequence — countDocuments()+1 was racy under concurrent
// requests and could hand out the same challanNo to two challans. Also
// tolerates the counter being behind reality (e.g. a challan created before
// this sequence existed, or restored from a backup) by skipping past any
// number that's already taken instead of failing the whole request.
async function genChallanNo() {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = await nextSequence(`challanNo-${year}`);
    const challanNo = `UOMP-${year}-${String(seq).padStart(5, '0')}`;
    if (!(await FeeChallan.exists({ challanNo }))) return challanNo;
  }
  throw new Error('Could not generate a unique challan number — please try again.');
}

router.get('/fee-structures', verifyFinanceToken, async (req, res) => {
  try {
    const { program, semester, academicSession } = req.query;
    const f = {};
    if (program)         f.program         = new RegExp(escapeRegex(program), 'i');
    if (semester)        f.semester        = semester;
    if (academicSession) f.academicSession = academicSession;
    res.json(await FeeStructure.find(f).sort({ createdAt: -1 }));
  } catch (err) { res.sendServerError(err); }
});

// Fee structures are tied to real, active department/program/semester/session
// records — departmentRef/programRef/semesterRef/sessionRef resolve and
// reject unknown/inactive ids before a structure can ever be created.
router.post('/fee-structures', verifyFinanceToken, [
  departmentRef({ optional: true }),
  programRef({ optional: false }),
  semesterRef({ optional: false }),
  sessionRef({ optional: false }),
  nonEmptyArray('feeItems'),
  validate,
], async (req, res) => {
  try {
    const { feeItems, dueDate, lateFeePerDay } = req.body;
    const items       = feeItems.map(i => ({ description: i.description, amount: Number(i.amount) }));
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);
    const structure   = await FeeStructure.create(snapshotRefs(req, {
      feeItems: items, totalAmount, dueDate: dueDate || undefined,
      lateFeePerDay: Number(lateFeePerDay) || 0, createdBy: req.user.id,
    }));
    await logAudit(req, {
      action: 'feeStructure.create', entityType: 'FeeStructure', entityId: structure._id,
      entityLabel: `${structure.program} — ${structure.semester}`, after: { totalAmount, program: structure.program, semester: structure.semester },
    });
    res.status(201).json({ message: 'Fee structure created.', structure });
  } catch (err) { res.sendServerError(err); }
});

router.patch('/fee-structures/:id', verifyFinanceToken, [
  departmentRef({ optional: true }),
  programRef({ optional: true }),
  semesterRef({ optional: true }),
  sessionRef({ optional: true }),
  nonEmptyArray('feeItems', { optional: true }),
  validate,
], async (req, res) => {
  try {
    const s = await FeeStructure.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found.' });
    const before = { totalAmount: s.totalAmount, isActive: s.isActive, dueDate: s.dueDate };
    const { feeItems, dueDate, lateFeePerDay, isActive } = req.body;
    snapshotRefs(req, s);
    if (feeItems      !== undefined) {
      s.feeItems    = feeItems.map(i => ({ description: i.description, amount: Number(i.amount) }));
      s.totalAmount = s.feeItems.reduce((sum, i) => sum + i.amount, 0);
    }
    if (dueDate       !== undefined) s.dueDate       = dueDate || undefined;
    if (lateFeePerDay !== undefined) s.lateFeePerDay = Number(lateFeePerDay) || 0;
    if (isActive      !== undefined) s.isActive      = isActive;
    await s.save();
    await logAudit(req, {
      action: 'feeStructure.update', entityType: 'FeeStructure', entityId: s._id,
      entityLabel: `${s.program} — ${s.semester}`,
      before, after: { totalAmount: s.totalAmount, isActive: s.isActive, dueDate: s.dueDate },
    });
    res.json({ message: 'Updated.', structure: s });
  } catch (err) { res.sendServerError(err); }
});

router.delete('/fee-structures/:id', verifyFinanceToken, async (req, res) => {
  try {
    const s = await FeeStructure.findByIdAndDelete(req.params.id);
    if (s) {
      await logAudit(req, {
        action: 'feeStructure.delete', entityType: 'FeeStructure', entityId: s._id,
        entityLabel: `${s.program} — ${s.semester}`, before: { totalAmount: s.totalAmount },
      });
    }
    res.json({ message: 'Deleted.' });
  } catch (err) { res.sendServerError(err); }
});

router.get('/fee-records', verifyFinanceToken, async (req, res) => {
  try {
    const { status, program, semester, search, academicSession } = req.query;
    const f = {};
    if (status)          f.status          = status;
    if (program)         f.program         = new RegExp(escapeRegex(program), 'i');
    if (semester)        f.semester        = semester;
    if (academicSession) f.academicSession = academicSession;
    if (search)          f.$or             = [{ registrationNo: new RegExp(escapeRegex(search), 'i') }, { studentName: new RegExp(escapeRegex(search), 'i') }];
    res.json(await FeeRecord.find(f).sort({ createdAt: -1 }));
  } catch (err) { res.sendServerError(err); }
});

router.patch('/fee-records/:id', verifyFinanceToken, [
  enumField('status', FEE_RECORD_STATUS, { optional: true }),
  numberInRange('paidAmount', { min: 0 }),
  optionalString('paymentMethod', { max: 60 }),
  optionalString('transactionRef', { max: 100 }),
  optionalString('remarks', { max: 1000 }),
  validate,
], async (req, res) => {
  try {
    const rec = await FeeRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found.' });
    const before = { status: rec.status, paidAmount: rec.paidAmount };
    const { status, paidAmount, paymentMethod, transactionRef, remarks } = req.body;
    if (status         !== undefined) rec.status         = status;
    if (paidAmount     !== undefined) rec.paidAmount     = Number(paidAmount);
    if (paymentMethod  !== undefined) rec.paymentMethod  = paymentMethod;
    if (transactionRef !== undefined) rec.transactionRef = transactionRef;
    if (remarks        !== undefined) rec.remarks        = remarks;
    if (status === 'paid') rec.paidAt = new Date();
    rec.updatedBy = req.user.id;
    await rec.save();
    await logAudit(req, {
      action: 'feeRecord.update', entityType: 'FeeRecord', entityId: rec._id, entityLabel: rec.registrationNo,
      before, after: { status: rec.status, paidAmount: rec.paidAmount },
    });
    res.json({ message: 'Updated.', record: rec });
  } catch (err) { res.sendServerError(err); }
});

router.get('/challans', verifyFinanceToken, async (req, res) => {
  try {
    const { status, program, semester, search, academicSession } = req.query;
    const f = {};
    if (status)          f.status          = status;
    if (program)         f.program         = new RegExp(escapeRegex(program), 'i');
    if (semester)        f.semester        = semester;
    if (academicSession) f.academicSession = academicSession;
    if (search)          f.$or             = [{ registrationNo: new RegExp(escapeRegex(search), 'i') }, { studentName: new RegExp(escapeRegex(search), 'i') }, { challanNo: new RegExp(escapeRegex(search), 'i') }];
    res.json(await FeeChallan.find(f).sort({ createdAt: -1 }));
  } catch (err) { res.sendServerError(err); }
});

router.get('/challans/:id', verifyFinanceToken, async (req, res) => {
  try {
    const challan = await FeeChallan.findById(req.params.id);
    if (!challan) return res.status(404).json({ message: 'Challan not found.' });
    res.json(challan);
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/finance/challans/:id/receipt — receipt data for a paid
// challan (payment date + payment reference front and center); 404s for
// anything not yet paid so it can't be used to fabricate a receipt.
router.get('/challans/:id/receipt', verifyFinanceToken, async (req, res) => {
  try {
    const challan = await FeeChallan.findById(req.params.id);
    if (!challan) return res.status(404).json({ message: 'Challan not found.' });
    if (challan.status !== 'paid') return res.status(404).json({ message: 'This challan has not been paid yet — no receipt available.' });
    res.json({
      challanNo: challan.challanNo,
      registrationNo: challan.registrationNo,
      studentName: challan.studentName,
      department: challan.department,
      program: challan.program,
      semester: challan.semester,
      academicSession: challan.academicSession,
      feeItems: challan.feeItems,
      totalAmount: challan.totalAmount,
      paidAt: challan.paidAt,
      paymentRef: challan.paymentRef,
    });
  } catch (err) { res.sendServerError(err); }
});

// Resolves+validates a (student, feeStructure) pair for billing: student
// must be approved, and must actually belong to the fee structure's
// program/semester scope. Returns { error } or { student, fs }.
async function resolveChallanTarget(studentId, feeStructureId) {
  const student = await Student.findById(studentId).select('-password');
  if (!student) return { error: { status: 404, message: 'Student not found.' } };
  if (student.status !== 'approved') {
    return { error: { status: 400, message: `Challans can only be generated for approved students (${student.registrationNo} is ${student.status}).` } };
  }

  const fs = await FeeStructure.findOne({ _id: feeStructureId, isActive: true });
  if (!fs) return { error: { status: 404, message: 'Fee structure not found or inactive.' } };

  if (fs.programId && student.programId && String(fs.programId) !== String(student.programId)) {
    return { error: { status: 400, message: `Fee structure is for ${fs.program}; ${student.registrationNo} is enrolled in ${student.program || 'a different program'}.` } };
  }
  const fsSemMatch = String(fs.semester || '').match(/\d+/);
  const fsSemesterNumber = fsSemMatch ? Number(fsSemMatch[0]) : null;
  if (fsSemesterNumber != null && fsSemesterNumber !== student.currentSemester) {
    return { error: { status: 400, message: `Fee structure is for ${fs.semester}; ${student.registrationNo} is currently in Semester ${student.currentSemester}.` } };
  }

  return { student, fs };
}

async function createChallanFromStructure({ student, fs, dueDate, lateFeePerDay, bankName, bankAccount, bankBranch, paymentInstructions, generatedBy }) {
  const items       = fs.feeItems.map(i => ({ description: i.description, amount: i.amount }));
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const dueDateVal  = dueDate ? new Date(dueDate) : fs.dueDate;
  const lateFee     = lateFeePerDay !== undefined ? Number(lateFeePerDay) : fs.lateFeePerDay;
  const challanNo   = await genChallanNo();

  const feeRecord = await FeeRecord.create({
    student: student._id, registrationNo: student.registrationNo, studentName: student.fullName,
    fatherName: student.fatherName || '', department: fs.department || student.department, program: fs.program,
    semester: fs.semester, academicSession: fs.academicSession || '',
    feeStructure: fs._id, feeItems: items, totalAmount, dueDate: dueDateVal,
    updatedBy: generatedBy,
  });

  const challan = await FeeChallan.create({
    challanNo, feeRecord: feeRecord._id, student: student._id,
    registrationNo: student.registrationNo, studentName: student.fullName,
    fatherName: student.fatherName || '', department: fs.department || student.department,
    departmentId: fs.departmentId || student.departmentId, program: fs.program, programId: fs.programId || student.programId,
    semester: fs.semester, semesterId: fs.semesterId,
    academicSession: fs.academicSession || '', sessionId: fs.sessionId,
    feeStructure: fs._id, feeItems: items, totalAmount,
    dueDate: dueDateVal, lateFeePerDay: lateFee,
    bankName:            bankName            || 'Habib Bank Limited (HBL)',
    bankAccount:         bankAccount         || 'PK36HABB0002437900614201',
    bankBranch:          bankBranch          || 'Panjgur Branch',
    paymentInstructions: paymentInstructions || 'Deposit the fee amount in the university bank account and submit the original deposit slip to the Finance Section within the due date.',
    generatedBy,
  });
  return { challan, feeRecord };
}

// POST /api/portal/finance/challans — single challan, always generated from
// a fee structure (never free-text amounts), and only for approved students
// whose program/semester matches that structure's scope.
router.post('/challans', verifyFinanceToken, [mongoId('studentId'), mongoId('feeStructureId'), validate], async (req, res) => {
  try {
    const { studentId, feeStructureId, dueDate, lateFeePerDay, bankName, bankAccount, bankBranch, paymentInstructions } = req.body;
    const { student, fs, error } = await resolveChallanTarget(studentId, feeStructureId);
    if (error) return res.status(error.status).json({ message: error.message });

    const { challan, feeRecord } = await createChallanFromStructure({
      student, fs, dueDate, lateFeePerDay, bankName, bankAccount, bankBranch, paymentInstructions, generatedBy: req.user.id,
    });
    await logAudit(req, {
      action: 'challan.generate', entityType: 'FeeChallan', entityId: challan._id, entityLabel: challan.challanNo,
      after: { totalAmount: challan.totalAmount, registrationNo: student.registrationNo, status: 'generated' },
    });
    res.status(201).json({ message: 'Challan generated.', challan, feeRecord });
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.sendServerError(err);
  }
});

// POST /api/portal/finance/challans/bulk — generate challans for every
// approved student in a fee structure's program+semester scope, skipping
// anyone already billed against this exact fee structure.
router.post('/challans/bulk', verifyFinanceToken, [mongoId('feeStructureId'), validate], async (req, res) => {
  try {
    const { feeStructureId, dueDate, lateFeePerDay } = req.body;
    const fs = await FeeStructure.findOne({ _id: feeStructureId, isActive: true });
    if (!fs) return res.status(404).json({ message: 'Fee structure not found or inactive.' });

    const fsSemMatch = String(fs.semester || '').match(/\d+/);
    const fsSemesterNumber = fsSemMatch ? Number(fsSemMatch[0]) : null;

    const studentFilter = { status: 'approved' };
    if (fs.programId) studentFilter.programId = fs.programId;
    else if (fs.program) studentFilter.program = fs.program;
    if (fsSemesterNumber != null) studentFilter.currentSemester = fsSemesterNumber;

    const candidates = await Student.find(studentFilter).select('-password');
    const alreadyBilled = new Set(
      (await FeeChallan.find({ feeStructure: fs._id }).select('student')).map((c) => String(c.student))
    );

    const results = { generated: 0, skipped: 0, failed: 0, challans: [], errors: [] };
    for (const student of candidates) {
      if (alreadyBilled.has(String(student._id))) { results.skipped++; continue; }
      try {
        const { challan } = await createChallanFromStructure({ student, fs, dueDate, lateFeePerDay, generatedBy: req.user.id });
        results.generated++;
        results.challans.push({ studentId: student._id, registrationNo: student.registrationNo, challanNo: challan.challanNo });
      } catch (err) {
        results.failed++;
        results.errors.push(`${student.registrationNo}: ${err.message}`);
      }
    }

    await logAudit(req, {
      action: 'challan.bulk_generate', entityType: 'FeeStructure', entityId: fs._id,
      entityLabel: `${fs.program} — ${fs.semester}`,
      after: { generated: results.generated, skipped: results.skipped, failed: results.failed },
    });

    res.status(201).json({
      message: `${results.generated} challan(s) generated, ${results.skipped} already billed, ${results.failed} failed.`,
      ...results,
    });
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/portal/finance/challans/:id
// Status is a one-way state machine: generated -> paid | expired | cancelled.
// Once a challan leaves "generated" its status is final — in particular a
// challan can never be marked paid twice, and a paid/cancelled/expired
// challan can never be reopened.
router.patch('/challans/:id', verifyFinanceToken, [
  enumField('status', FEE_CHALLAN_STATUS, { optional: true }),
  optionalString('paymentRef', { max: 100 }),
  validate,
], async (req, res) => {
  try {
    const ch = await FeeChallan.findById(req.params.id);
    if (!ch) return res.status(404).json({ message: 'Not found.' });
    const statusBefore = ch.status;

    const { status } = req.body;
    let paymentRef = req.body.paymentRef !== undefined ? req.body.paymentRef.trim() : undefined;

    if (status !== undefined) {
      const allowed = CHALLAN_TRANSITIONS[ch.status];
      if (!allowed || !allowed.includes(status)) {
        return res.status(409).json({
          message: ch.status === 'generated'
            ? `"${status}" is not a valid status. Allowed: ${CHALLAN_TRANSITIONS.generated.join(', ')}.`
            : `This challan is already "${ch.status}" and its status cannot be changed further.`,
        });
      }

      if (status === 'paid') {
        const ref = paymentRef !== undefined ? paymentRef : (ch.paymentRef || '');
        if (!ref) return res.status(400).json({ message: 'A payment reference is required to mark a challan as paid.' });
        paymentRef = ref;

        const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
        if (isNaN(paidAt.getTime())) return res.status(400).json({ message: 'paidAt must be a valid date.' });
        if (paidAt.getTime() > Date.now()) return res.status(400).json({ message: 'paidAt cannot be in the future.' });
        ch.paidAt = paidAt;
      }
    }

    if (paymentRef !== undefined && paymentRef !== '') {
      const dup = await FeeChallan.findOne({ paymentRef, _id: { $ne: ch._id } });
      if (dup) return res.status(409).json({ message: `Payment reference "${paymentRef}" is already used by challan ${dup.challanNo}.` });
      ch.paymentRef = paymentRef;
    }

    if (status !== undefined) ch.status = status;
    await ch.save();

    if (ch.feeRecord && status) {
      const rs = status === 'paid' ? 'paid' : status === 'expired' ? 'overdue' : 'unpaid';
      await FeeRecord.findByIdAndUpdate(ch.feeRecord, { status: rs, ...(status === 'paid' ? { paidAt: ch.paidAt } : {}) });
    }

    if (status !== undefined && status !== statusBefore) {
      const action = status === 'paid' ? 'challan.payment_recorded'
        : status === 'cancelled' ? 'challan.cancel'
        : 'challan.status_change';
      await logAudit(req, {
        action, entityType: 'FeeChallan', entityId: ch._id, entityLabel: ch.challanNo,
        before: { status: statusBefore }, after: { status, paymentRef: ch.paymentRef, paidAt: ch.paidAt },
      });
    }

    res.json({ message: 'Updated.', challan: ch });
  } catch (err) {
    if (isDuplicateKeyError(err)) return res.status(400).json({ message: duplicateKeyMessage(err) });
    res.sendServerError(err);
  }
});

router.get('/fee-stats', verifyFinanceToken, async (req, res) => {
  try {
    const [total, paid, unpaid, overdue, partial] = await Promise.all([
      FeeRecord.countDocuments(),
      FeeRecord.countDocuments({ status: 'paid' }),
      FeeRecord.countDocuments({ status: 'unpaid' }),
      FeeRecord.countDocuments({ status: 'overdue' }),
      FeeRecord.countDocuments({ status: 'partial' }),
    ]);
    const [colAgg] = await FeeRecord.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, t: { $sum: '$paidAmount' } } }]);
    const [penAgg] = await FeeRecord.aggregate([{ $match: { status: { $in: ['unpaid','overdue','partial'] } } }, { $group: { _id: null, t: { $sum: '$totalAmount' } } }]);
    res.json({ totalRecords: total, paid, unpaid, overdue, partial, totalCollected: colAgg?.t || 0, totalPending: penAgg?.t || 0 });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/portal/finance/reports/outstanding-balances?department=&program=&groupBy=student|department&page=&limit=
// Paginated outstanding-balance report — per student by default, or rolled
// up per department with groupBy=department.
router.get('/reports/outstanding-balances', verifyFinanceToken, async (req, res) => {
  try {
    const { department, program, groupBy, page, limit } = req.query;
    const match = { status: 'generated' };
    if (department && mongoose.isValidObjectId(department)) match.departmentId = new mongoose.Types.ObjectId(department);
    if (program && mongoose.isValidObjectId(program)) match.programId = new mongoose.Types.ObjectId(program);

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const groupId = groupBy === 'department' ? { $ifNull: ['$departmentId', '$department'] } : '$student';

    const basePipeline = [
      { $match: match },
      { $group: {
        _id: groupId,
        registrationNo:    { $first: '$registrationNo' },
        studentName:        { $first: '$studentName' },
        department:         { $first: '$department' },
        program:            { $first: '$program' },
        semester:           { $first: '$semester' },
        outstandingAmount:  { $sum: '$totalAmount' },
        unpaidChallans:     { $sum: 1 },
      } },
      { $sort: { outstandingAmount: -1 } },
    ];

    const [rows, countResult] = await Promise.all([
      FeeChallan.aggregate([...basePipeline, { $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }]),
      FeeChallan.aggregate([...basePipeline, { $count: 'total' }]),
    ]);
    const total = countResult[0]?.total || 0;

    res.json({ data: rows, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) || 1, groupBy: groupBy === 'department' ? 'department' : 'student' });
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
