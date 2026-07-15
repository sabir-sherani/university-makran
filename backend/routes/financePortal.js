const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const FinanceStaff = require('../models/FinanceStaff');
const Student = require('../models/Student');
const { verifyFinanceToken } = require('../middleware/auth');

// POST /api/portal/finance/login
router.post('/login', async (req, res) => {
  try {
    const { financeId, password } = req.body;
    const staff = await FinanceStaff.findOne({ financeId });
    if (!staff) return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    if (staff.status === 'inactive') return res.status(403).json({ message: 'Your account is inactive. Contact admin.' });

    const token = jwt.sign(
      { id: staff._id, role: 'finance', financeId: staff.financeId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const staffData = staff.toObject();
    delete staffData.password;
    res.json({ token, staff: staffData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/finance/profile
router.get('/profile', verifyFinanceToken, async (req, res) => {
  try {
    const staff = await FinanceStaff.findById(req.user.id).select('-password');
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
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
      { fullName:       { $regex: search, $options: 'i' } },
      { registrationNo: { $regex: search, $options: 'i' } },
      { email:          { $regex: search, $options: 'i' } },
    ];
    const students = await Student.find(filter)
      .select('registrationNo fullName email phone department program currentSemester session status createdAt')
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Fee Management ──────────────────────────────────────────────────────────────
const FeeStructure = require('../models/FeeStructure');
const FeeRecord    = require('../models/FeeRecord');
const FeeChallan   = require('../models/FeeChallan');

async function genChallanNo() {
  const year  = new Date().getFullYear();
  const count = await FeeChallan.countDocuments();
  return `UOMP-${year}-${String(count + 1).padStart(5, '0')}`;
}

router.get('/fee-structures', verifyFinanceToken, async (req, res) => {
  try {
    const { program, semester, academicSession } = req.query;
    const f = {};
    if (program)         f.program         = new RegExp(program, 'i');
    if (semester)        f.semester        = semester;
    if (academicSession) f.academicSession = academicSession;
    res.json(await FeeStructure.find(f).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/fee-structures', verifyFinanceToken, async (req, res) => {
  try {
    const { program, department, semester, academicSession, feeItems, dueDate, lateFeePerDay } = req.body;
    if (!program || !semester) return res.status(400).json({ message: 'Program and semester are required.' });
    if (!feeItems?.length)     return res.status(400).json({ message: 'At least one fee item is required.' });
    const items       = feeItems.map(i => ({ description: i.description, amount: Number(i.amount) }));
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);
    const structure   = await FeeStructure.create({
      program, department: department || '', semester, academicSession: academicSession || '',
      feeItems: items, totalAmount, dueDate: dueDate || undefined,
      lateFeePerDay: Number(lateFeePerDay) || 0, createdBy: req.user.id,
    });
    res.status(201).json({ message: 'Fee structure created.', structure });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/fee-structures/:id', verifyFinanceToken, async (req, res) => {
  try {
    const s = await FeeStructure.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Not found.' });
    const { program, department, semester, academicSession, feeItems, dueDate, lateFeePerDay, isActive } = req.body;
    if (program         !== undefined) s.program         = program;
    if (department      !== undefined) s.department      = department;
    if (semester        !== undefined) s.semester        = semester;
    if (academicSession !== undefined) s.academicSession = academicSession;
    if (feeItems        !== undefined) {
      s.feeItems    = feeItems.map(i => ({ description: i.description, amount: Number(i.amount) }));
      s.totalAmount = s.feeItems.reduce((sum, i) => sum + i.amount, 0);
    }
    if (dueDate       !== undefined) s.dueDate       = dueDate || undefined;
    if (lateFeePerDay !== undefined) s.lateFeePerDay = Number(lateFeePerDay) || 0;
    if (isActive      !== undefined) s.isActive      = isActive;
    await s.save();
    res.json({ message: 'Updated.', structure: s });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/fee-structures/:id', verifyFinanceToken, async (req, res) => {
  try {
    await FeeStructure.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/fee-records', verifyFinanceToken, async (req, res) => {
  try {
    const { status, program, semester, search, academicSession } = req.query;
    const f = {};
    if (status)          f.status          = status;
    if (program)         f.program         = new RegExp(program, 'i');
    if (semester)        f.semester        = semester;
    if (academicSession) f.academicSession = academicSession;
    if (search)          f.$or             = [{ registrationNo: new RegExp(search, 'i') }, { studentName: new RegExp(search, 'i') }];
    res.json(await FeeRecord.find(f).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/fee-records/:id', verifyFinanceToken, async (req, res) => {
  try {
    const rec = await FeeRecord.findById(req.params.id);
    if (!rec) return res.status(404).json({ message: 'Not found.' });
    const { status, paidAmount, paymentMethod, transactionRef, remarks } = req.body;
    if (status         !== undefined) rec.status         = status;
    if (paidAmount     !== undefined) rec.paidAmount     = Number(paidAmount);
    if (paymentMethod  !== undefined) rec.paymentMethod  = paymentMethod;
    if (transactionRef !== undefined) rec.transactionRef = transactionRef;
    if (remarks        !== undefined) rec.remarks        = remarks;
    if (status === 'paid') rec.paidAt = new Date();
    rec.updatedBy = req.user.id;
    await rec.save();
    res.json({ message: 'Updated.', record: rec });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/challans', verifyFinanceToken, async (req, res) => {
  try {
    const { status, program, semester, search, academicSession } = req.query;
    const f = {};
    if (status)          f.status          = status;
    if (program)         f.program         = new RegExp(program, 'i');
    if (semester)        f.semester        = semester;
    if (academicSession) f.academicSession = academicSession;
    if (search)          f.$or             = [{ registrationNo: new RegExp(search, 'i') }, { studentName: new RegExp(search, 'i') }, { challanNo: new RegExp(search, 'i') }];
    res.json(await FeeChallan.find(f).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/challans', verifyFinanceToken, async (req, res) => {
  try {
    const { studentId, feeStructureId, feeItems, dueDate, lateFeePerDay, bankName, bankAccount, bankBranch, paymentInstructions, academicSession } = req.body;
    const student = await Student.findById(studentId).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    let items = feeItems || [];
    let dueDateVal = dueDate ? new Date(dueDate) : undefined;
    let lateFee    = Number(lateFeePerDay) || 0;

    if (feeStructureId) {
      const fs = await FeeStructure.findById(feeStructureId);
      if (fs) {
        items      = fs.feeItems;
        dueDateVal = dueDate ? new Date(dueDate) : fs.dueDate;
        lateFee    = lateFeePerDay !== undefined ? Number(lateFeePerDay) : fs.lateFeePerDay;
      }
    }
    if (!items.length) return res.status(400).json({ message: 'Fee items are required.' });

    const mapped      = items.map(i => ({ description: i.description, amount: Number(i.amount) }));
    const totalAmount = mapped.reduce((s, i) => s + i.amount, 0);
    const challanNo   = await genChallanNo();

    const feeRecord = await FeeRecord.create({
      student: student._id, registrationNo: student.registrationNo, studentName: student.fullName,
      fatherName: student.fatherName || '', department: student.department, program: student.program,
      semester: `Semester ${student.currentSemester}`, academicSession: academicSession || '',
      feeStructure: feeStructureId || undefined, feeItems: mapped, totalAmount, dueDate: dueDateVal,
      updatedBy: req.user.id,
    });

    const challan = await FeeChallan.create({
      challanNo, feeRecord: feeRecord._id, student: student._id,
      registrationNo: student.registrationNo, studentName: student.fullName,
      fatherName: student.fatherName || '', department: student.department,
      program: student.program, semester: `Semester ${student.currentSemester}`,
      academicSession: academicSession || '', feeItems: mapped, totalAmount,
      dueDate: dueDateVal, lateFeePerDay: lateFee,
      bankName:            bankName            || 'Habib Bank Limited (HBL)',
      bankAccount:         bankAccount         || 'PK36HABB0002437900614201',
      bankBranch:          bankBranch          || 'Panjgur Branch',
      paymentInstructions: paymentInstructions || 'Deposit the fee amount in the university bank account and submit the original deposit slip to the Finance Section within the due date.',
      generatedBy: req.user.id,
    });
    res.status(201).json({ message: 'Challan generated.', challan, feeRecord });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/challans/:id', verifyFinanceToken, async (req, res) => {
  try {
    const ch = await FeeChallan.findById(req.params.id);
    if (!ch) return res.status(404).json({ message: 'Not found.' });
    const { status, paymentRef } = req.body;
    if (status     !== undefined) { ch.status = status; if (status === 'paid') ch.paidAt = new Date(); }
    if (paymentRef !== undefined) ch.paymentRef = paymentRef;
    await ch.save();
    if (ch.feeRecord && status) {
      const rs = status === 'paid' ? 'paid' : status === 'expired' ? 'overdue' : 'unpaid';
      await FeeRecord.findByIdAndUpdate(ch.feeRecord, { status: rs, ...(status === 'paid' ? { paidAt: new Date() } : {}) });
    }
    res.json({ message: 'Updated.', challan: ch });
  } catch (err) { res.status(500).json({ message: err.message }); }
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
