const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Department = require('./models/Department');
const Admin = require('./models/Admin');
const TeacherIdSlot = require('./models/TeacherIdSlot');

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

const teacherIdSlots = [
  { teacherId: 'TCH-2024-001' },
  { teacherId: 'TCH-2024-002' },
  { teacherId: 'TCH-2024-003' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB\n');

  // Seed departments
  console.log('--- Seeding Departments ---');
  for (const dept of departments) {
    const exists = await Department.findOne({ slug: dept.slug });
    if (!exists) {
      await Department.create(dept);
      console.log(`✓ Created: ${dept.name}`);
    } else {
      console.log(`- Already exists: ${dept.name}`);
    }
  }

  // Seed default admin
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

  // Seed teacher ID slots
  console.log('\n--- Seeding Teacher ID Slots ---');
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
  console.log('\nSeed complete!');
  console.log('\nAdmin login: admin@uomp.edu.pk / Admin@123');
  console.log('Teacher IDs: TCH-2024-001, TCH-2024-002, TCH-2024-003');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
