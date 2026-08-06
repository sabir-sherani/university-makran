// Ensures every unique/compound index declared in the Mongoose schemas
// actually exists in MongoDB (Atlas or local) — collections created before an
// index was added to a schema won't have it until this runs. Also drops a
// couple of known-stale indexes from earlier schema versions.
//
// Usage: node fixIndexes.js
const mongoose = require('mongoose');
require('dotenv').config();

const MODELS = [
  require('./models/Student'),
  require('./models/Teacher'),
  require('./models/HOD'),
  require('./models/ExaminationStaff'),
  require('./models/FinanceStaff'),
  require('./models/Employee'),
  require('./models/TeacherIdSlot'),
  require('./models/FeeChallan'),
  require('./models/Department'),
  require('./models/Program'),
  require('./models/AcademicSession'),
  require('./models/Semester'),
  require('./models/SemesterCourse'),
  require('./models/Designation'),
  require('./models/Admin'),
  require('./models/DegreeVerification'),
  require('./models/Counter'),
];

async function dropStaleIndexes(db) {
  // Fix Student collection — drop old studentId unique index
  try {
    const studentIndexes = await db.collection('students').indexes();
    console.log('\nCurrent Student indexes:', studentIndexes.map(i => i.name));
    for (const idx of studentIndexes) {
      if (idx.key && idx.key.studentId !== undefined) {
        await db.collection('students').dropIndex(idx.name);
        console.log(`  dropped stale index: ${idx.name} (studentId)`);
      }
    }
  } catch (e) {
    console.log('Student stale-index check:', e.message);
  }

  // Fix Employee collection — drop old empId unique index if collection exists
  try {
    const collections = await db.listCollections({ name: 'employees' }).toArray();
    if (collections.length > 0) {
      const empIndexes = await db.collection('employees').indexes();
      for (const idx of empIndexes) {
        if (idx.key && idx.key.empId !== undefined && idx.name !== 'empId_1') {
          await db.collection('employees').dropIndex(idx.name);
          console.log(`  dropped stale index: ${idx.name} (empId) from employees`);
        }
      }
    }
  } catch (e) {
    console.log('Employee stale-index check:', e.message);
  }
}

async function ensureDeclaredIndexes() {
  console.log('\nEnsuring every schema-declared index exists...');
  for (const Model of MODELS) {
    try {
      // Additive only — creates any index declared in the schema that is
      // missing from the collection. Never drops indexes that aren't in the
      // schema, so it's safe to run against a live Atlas cluster.
      await Model.createIndexes();
      console.log(`  ✓ ${Model.modelName}`);
    } catch (e) {
      console.log(`  ✗ ${Model.modelName}: ${e.message}`);
    }
  }
}

async function fixIndexes() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  await dropStaleIndexes(db);
  await ensureDeclaredIndexes();

  await mongoose.disconnect();
  console.log('\nDone. All schema-declared indexes now exist (or the errors above need manual attention).');
}

fixIndexes().catch(err => {
  console.error(err);
  process.exit(1);
});
