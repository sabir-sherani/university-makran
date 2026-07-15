const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Fix Student collection — drop old studentId unique index
  try {
    const studentIndexes = await db.collection('students').indexes();
    console.log('\nCurrent Student indexes:', studentIndexes.map(i => i.name));

    for (const idx of studentIndexes) {
      if (idx.key && idx.key.studentId !== undefined) {
        await db.collection('students').dropIndex(idx.name);
        console.log(`✓ Dropped stale index: ${idx.name} (studentId)`);
      }
    }
  } catch (e) {
    console.log('Student index fix:', e.message);
  }

  // Fix Employee collection — drop old empId unique index if collection exists
  try {
    const collections = await db.listCollections({ name: 'employees' }).toArray();
    if (collections.length > 0) {
      const empIndexes = await db.collection('employees').indexes();
      for (const idx of empIndexes) {
        if (idx.key && (idx.key.empId !== undefined)) {
          await db.collection('employees').dropIndex(idx.name);
          console.log(`✓ Dropped stale index: ${idx.name} (empId) from employees`);
        }
      }
    }
  } catch (e) {
    console.log('Employee index fix:', e.message);
  }

  await mongoose.disconnect();
  console.log('\nDone! Stale indexes removed. You can now register students normally.');
}

fixIndexes().catch(err => {
  console.error(err);
  process.exit(1);
});
