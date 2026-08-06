// Seeds the official reference records (departments, a demo program, an
// academic session, its semesters, designations, a fee structure) plus one
// approved demo account per portal role, so a fresh database is immediately
// usable for WORKFLOW_DEMO.md without registering everything by hand first.
//
// Every write here goes through Mongoose .create()/.save(), so it's still
// bound by the same schema-level validation (regex formats, required
// fields, enums) as the real portal routes — nothing here can produce a
// record the app itself wouldn't accept.
//
// Idempotent: safe to re-run against an existing database. Anything that
// already exists (matched by its unique key) is left untouched and logged
// as "already exists" instead of being duplicated.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Department = require('./models/Department');
const Program = require('./models/Program');
const AcademicSession = require('./models/AcademicSession');
const Semester = require('./models/Semester');
const Designation = require('./models/Designation');
const FeeStructure = require('./models/FeeStructure');
const Admin = require('./models/Admin');
const Teacher = require('./models/Teacher');
const HOD = require('./models/HOD');
const ExaminationStaff = require('./models/ExaminationStaff');
const FinanceStaff = require('./models/FinanceStaff');
const TeacherIdSlot = require('./models/TeacherIdSlot');
const OngoingClass = require('./models/OngoingClass');

// Shared by every new demo account below (letter + digit, 8+ chars — passes
// the same password validator the real registration/creation forms use).
const DEMO_PASSWORD = 'Demo@1234';

const departments = [
  {
    name: 'Education',
    slug: 'education',
    description:
      'The Department of Education at University of Makran is dedicated to preparing competent educators and educational leaders. It offers programs that blend theory with practical classroom experience.',
  },
  {
    name: 'CS & IT',
    slug: 'cs-it',
    description:
      'The Department of Computer Science & Information Technology equips students with modern computing skills covering programming, networks, databases, software engineering, and emerging technologies.',
  },
  {
    name: 'Botany',
    slug: 'botany',
    description:
      'The Department of Botany focuses on plant biology, ecology, and environmental science. Students explore plant diversity, physiology, and the role of plants in sustaining ecosystems.',
  },
  {
    name: 'English',
    slug: 'english',
    description:
      'The Department of English Language and Literature cultivates strong communication, critical thinking, and literary analysis skills. It offers programs in linguistics, creative writing, and literature.',
  },
  {
    name: 'IR',
    slug: 'ir',
    description:
      'The Department of International Relations prepares students to understand global politics, diplomacy, foreign policy, and international law in a rapidly changing world.',
  },
  {
    name: 'Social Work',
    slug: 'social-work',
    description:
      'The Department of Social Work trains professionals to address social issues, support communities, and promote welfare through evidence-based practice and compassionate service.',
  },
  {
    name: 'Balochi',
    slug: 'balochi',
    description:
      'The Department of Balochi Language and Literature preserves and promotes Balochi culture, heritage, and literature. It offers comprehensive study of Balochi poetry, prose, and linguistics.',
  },
  {
    name: 'BBA',
    slug: 'bba',
    description:
      'The Department of Business Administration offers a rigorous BBA program covering management, marketing, finance, accounting, and entrepreneurship to develop future business leaders.',
  },
];

// Spare, unused teacher-registration slots (beyond the one the demo teacher
// account below consumes) — handy for testing the registration flow itself.
const teacherIdSlots = [
  { teacherId: 'TCH-2024-001' },
  { teacherId: 'TCH-2024-002' },
  { teacherId: 'TCH-2024-003' },
];

const DESIGNATIONS = [
  'Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor',
  'Head of Department', 'Examination Officer', 'Finance Officer',
];

const credentialsLog = [];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB\n');

  // ── Departments ──────────────────────────────────────────────────────────
  console.log('--- Seeding Departments ---');
  const deptDocs = {};
  for (const dept of departments) {
    let doc = await Department.findOne({ slug: dept.slug });
    if (!doc) {
      doc = await Department.create(dept);
      console.log(`✓ Created department: ${dept.name}`);
    } else {
      console.log(`- Department already exists: ${dept.name}`);
    }
    deptDocs[dept.slug] = doc;
  }
  const csit = deptDocs['cs-it'];

  // ── Demo program (linked to CS & IT) ────────────────────────────────────
  console.log('\n--- Seeding Demo Program ---');
  let program = await Program.findOne({ title: 'BS Computer Science' });
  if (!program) {
    program = await Program.create({
      title: 'BS Computer Science',
      category: 'Science',
      duration: '4 Years',
      semesters: '8',
      shortDescription: 'A four-year undergraduate program covering programming, systems, and software engineering.',
      level: 'Undergraduate',
      department: csit._id,
    });
    console.log('✓ Created program: BS Computer Science (CS & IT)');
  } else {
    console.log('- Program already exists: BS Computer Science');
  }

  // ── Demo academic session ───────────────────────────────────────────────
  console.log('\n--- Seeding Demo Academic Session ---');
  let session = await AcademicSession.findOne({ name: '2024-2028' });
  if (!session) {
    session = await AcademicSession.create({
      name: '2024-2028', startYear: '2024', endYear: '2028',
      program: program.title, department: csit.name,
      status: 'active', isActive: true,
    });
    console.log('✓ Created academic session: 2024-2028');
  } else {
    console.log('- Academic session already exists: 2024-2028');
  }

  // ── Semesters 1-8 for the demo program ──────────────────────────────────
  console.log('\n--- Seeding Semesters (1-8) for BS Computer Science ---');
  const semesterDocs = [];
  for (let n = 1; n <= 8; n++) {
    let sem = await Semester.findOne({ programId: program._id, number: n });
    if (!sem) {
      sem = await Semester.create({
        name: `Semester ${n}`, number: n,
        program: program.title, department: csit.name, academicSession: session.name,
        programId: program._id, departmentId: csit._id,
        status: n === 1 ? 'active' : 'upcoming', isActive: true,
      });
      console.log(`✓ Created Semester ${n}`);
    } else {
      console.log(`- Semester ${n} already exists`);
    }
    semesterDocs.push(sem);
  }
  const semester1 = semesterDocs[0];

  // ── Designations ─────────────────────────────────────────────────────────
  console.log('\n--- Seeding Designations ---');
  for (const title of DESIGNATIONS) {
    const exists = await Designation.findOne({ title });
    if (!exists) {
      await Designation.create({ title, isActive: true });
      console.log(`✓ Created designation: ${title}`);
    } else {
      console.log(`- Designation already exists: ${title}`);
    }
  }

  // ── Demo fee structure (Semester 1) ─────────────────────────────────────
  console.log('\n--- Seeding Demo Fee Structure ---');
  let feeStructure = await FeeStructure.findOne({ programId: program._id, semesterId: semester1._id });
  if (!feeStructure) {
    const feeItems = [
      { description: 'Tuition Fee', amount: 35000 },
      { description: 'Admission Fee', amount: 5000 },
      { description: 'Library Fee', amount: 1000 },
      { description: 'Sports Fee', amount: 500 },
    ];
    const totalAmount = feeItems.reduce((s, i) => s + i.amount, 0);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    feeStructure = await FeeStructure.create({
      program: program.title, programId: program._id,
      department: csit.name, departmentId: csit._id,
      semester: semester1.name, semesterId: semester1._id,
      academicSession: session.name, sessionId: session._id,
      feeItems, totalAmount, dueDate, lateFeePerDay: 100, isActive: true,
    });
    console.log(`✓ Created fee structure: BS Computer Science — Semester 1 (Rs. ${totalAmount})`);
  } else {
    console.log('- Fee structure already exists: BS Computer Science — Semester 1');
  }

  // ── Admin (unchanged from earlier seeds — kept for backward compatibility) ─
  console.log('\n--- Seeding Admin ---');
  const adminEmail = 'admin@uomp.edu.pk';
  const existingAdmin = await Admin.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await Admin.create({
      email: adminEmail,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin',
    });
    console.log(`✓ Admin created: ${adminEmail} / Admin@123`);
  } else {
    console.log(`- Admin already exists: ${adminEmail}`);
  }
  credentialsLog.push({ role: 'Admin', loginField: 'Email', id: adminEmail, password: 'Admin@123' });

  // ── Demo Teacher (pre-approved) ─────────────────────────────────────────
  console.log('\n--- Seeding Demo Teacher ---');
  const teacherId = 'TCH-DEMO-001';
  const teacherEmail = 'teacher.demo@uomp.edu.pk';
  let teacher = await Teacher.findOne({ email: teacherEmail });
  if (!teacher) {
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    teacher = await Teacher.create({
      teacherId, fullName: 'Ayesha Demo Khan', email: teacherEmail, password: hashed,
      phone: '03001234567', cnic: '11111-1111111-1',
      department: csit.name, departmentId: csit._id,
      qualification: 'MS Computer Science', designation: 'Lecturer',
      status: 'approved',
    });
    console.log(`✓ Teacher created: ${teacherEmail} / ${DEMO_PASSWORD} (teacherId: ${teacherId})`);
  } else {
    console.log(`- Teacher already exists: ${teacherEmail}`);
  }
  credentialsLog.push({ role: 'Teacher', loginField: 'Teacher ID', id: teacherId, password: DEMO_PASSWORD });

  // Reserve/consume its TeacherIdSlot so the admin's Teacher IDs list reflects it.
  let teacherSlot = await TeacherIdSlot.findOne({ teacherId });
  if (!teacherSlot) {
    await TeacherIdSlot.create({ teacherId, isUsed: true, usedBy: teacherEmail });
    console.log(`✓ Reserved Teacher ID slot: ${teacherId}`);
  } else if (!teacherSlot.isUsed) {
    teacherSlot.isUsed = true;
    teacherSlot.usedBy = teacherEmail;
    await teacherSlot.save();
    console.log(`✓ Marked Teacher ID slot as used: ${teacherId}`);
  } else {
    console.log(`- Teacher ID slot already reserved: ${teacherId}`);
  }

  // ── Demo ongoing class for the demo teacher (Semester 1) ────────────────
  console.log('\n--- Seeding Demo Ongoing Class ---');
  let ongoingClass = await OngoingClass.findOne({ teacher: teacher._id, subject: 'Introduction to Programming' });
  if (!ongoingClass) {
    ongoingClass = await OngoingClass.create({
      className: 'BSCS-1A', subject: 'Introduction to Programming',
      department: csit.name, departmentId: csit._id,
      program: program.title, programId: program._id,
      semester: semester1.name, academicSession: session.name, sessionId: session._id,
      timeSession: 'Morning',
      teacher: teacher._id, teacherName: teacher.fullName, teacherId: teacher.teacherId,
      days: ['Monday', 'Wednesday'], startTime: '09:00', endTime: '10:30',
      room: 'Room 101', weeklyHours: 3, maxStudents: 50,
      status: 'active', createdBy: teacher._id, createdByRole: 'teacher',
    });
    console.log('✓ Created ongoing class: Introduction to Programming (BSCS-1A, Semester 1)');
  } else {
    console.log('- Ongoing class already exists: Introduction to Programming');
  }

  // ── Demo HOD (CS & IT, pre-approved) ────────────────────────────────────
  console.log('\n--- Seeding Demo HOD ---');
  const hodId = 'HOD-DEMO-001';
  const hodEmail = 'hod.demo@uomp.edu.pk';
  const existingHod = await HOD.findOne({ email: hodEmail });
  if (!existingHod) {
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    await HOD.create({
      hodId, fullName: 'Imran Demo Baloch', email: hodEmail, password: hashed,
      phone: '03001234568', cnic: '22222-2222222-2',
      department: csit.name, departmentId: csit._id,
      designation: 'Head of Department', qualification: 'PhD Computer Science',
      status: 'active',
    });
    console.log(`✓ HOD created: ${hodEmail} / ${DEMO_PASSWORD} (hodId: ${hodId})`);
  } else {
    console.log(`- HOD already exists: ${hodEmail}`);
  }
  credentialsLog.push({ role: 'HOD (CS & IT)', loginField: 'HOD ID', id: hodId, password: DEMO_PASSWORD });

  // ── Demo Examination Staff ──────────────────────────────────────────────
  console.log('\n--- Seeding Demo Examination Staff ---');
  const examId = 'EXAM-DEMO-001';
  const examEmail = 'exam.demo@uomp.edu.pk';
  const existingExam = await ExaminationStaff.findOne({ email: examEmail });
  if (!existingExam) {
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    await ExaminationStaff.create({
      examId, fullName: 'Bilal Demo Rind', email: examEmail, password: hashed,
      phone: '03001234569', cnic: '33333-3333333-3',
      designation: 'Examination Officer', section: 'Result Processing',
      status: 'active',
    });
    console.log(`✓ Examination staff created: ${examEmail} / ${DEMO_PASSWORD} (examId: ${examId})`);
  } else {
    console.log(`- Examination staff already exists: ${examEmail}`);
  }
  credentialsLog.push({ role: 'Examination Section', loginField: 'Exam ID', id: examId, password: DEMO_PASSWORD });

  // ── Demo Finance Staff ───────────────────────────────────────────────────
  console.log('\n--- Seeding Demo Finance Staff ---');
  const financeId = 'FIN-DEMO-001';
  const financeEmail = 'finance.demo@uomp.edu.pk';
  const existingFinance = await FinanceStaff.findOne({ email: financeEmail });
  if (!existingFinance) {
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);
    await FinanceStaff.create({
      financeId, fullName: 'Nadia Demo Gichki', email: financeEmail, password: hashed,
      phone: '03001234570', cnic: '44444-4444444-4',
      designation: 'Finance Officer', department: csit.name, departmentId: csit._id,
      status: 'active',
    });
    console.log(`✓ Finance staff created: ${financeEmail} / ${DEMO_PASSWORD} (financeId: ${financeId})`);
  } else {
    console.log(`- Finance staff already exists: ${financeEmail}`);
  }
  credentialsLog.push({ role: 'Finance Section', loginField: 'Finance ID', id: financeId, password: DEMO_PASSWORD });

  // ── Spare teacher ID slots (for testing fresh teacher registration) ─────
  console.log('\n--- Seeding Spare Teacher ID Slots ---');
  for (const slot of teacherIdSlots) {
    const exists = await TeacherIdSlot.findOne({ teacherId: slot.teacherId });
    if (!exists) {
      await TeacherIdSlot.create(slot);
      console.log(`✓ Created Teacher ID: ${slot.teacherId}`);
    } else {
      console.log(`- Already exists: ${slot.teacherId}`);
    }
  }

  await mongoose.disconnect();

  console.log('\n=== Seed complete! ===');
  console.log('\nOfficial records ready for registration/creation dropdowns:');
  console.log('  Department: CS & IT   Program: BS Computer Science   Session: 2024-2028   Semesters: 1-8');
  console.log('  Fee structure: BS Computer Science — Semester 1 (Rs. 41,500, due in 30 days)');
  console.log('  Ongoing class: Introduction to Programming (BSCS-1A) — taught by the demo teacher, Semester 1');
  console.log('\nDemo accounts (all portals reachable at their respective /portal/<role> login):');
  for (const c of credentialsLog) {
    console.log(`  ${c.role.padEnd(22)} ${c.loginField}: ${c.id.padEnd(24)} Password: ${c.password}`);
  }
  console.log('\nSpare unused Teacher ID slots for live registration testing: TCH-2024-001, TCH-2024-002, TCH-2024-003');
  console.log('\nSee WORKFLOW_DEMO.md for the full end-to-end demo script using these records.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
