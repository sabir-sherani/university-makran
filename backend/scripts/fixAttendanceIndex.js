// Migrates the Attendance collection's old 2-field unique index
// { ongoingClassId, date } to the new 3-field { ongoingClassId, date, isMakeup }
// index required by make-up classes (Phase 3) — a make-up session can now
// share a date with a regular session for the same class, which the old
// index forbade. Follows the pattern in ../fixIndexes.js. Safe to re-run:
// does nothing once the old index is gone and the new one already exists.
//
// Usage: node scripts/fixAttendanceIndex.js
const mongoose = require('mongoose');
require('dotenv').config();

const OLD_INDEX_KEY = { ongoingClassId: 1, date: 1 };
const NEW_INDEX_KEY = { ongoingClassId: 1, date: 1, isMakeup: 1 };

function sameKey(a, b) {
  const ak = Object.keys(a || {});
  const bk = Object.keys(b || {});
  return ak.length === bk.length && ak.every((k) => b[k] === a[k]);
}

async function fixAttendanceIndex() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran');
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('attendances');

  let indexes = [];
  try {
    indexes = await collection.indexes();
  } catch (e) {
    console.log('  attendances collection does not exist yet — nothing to migrate.');
  }

  if (indexes.length) {
    // Existing documents predate the `isMakeup` field entirely (Mongoose
    // schema defaults only apply on save, not retroactively) — backfill it so
    // the new index key is present and explicit on every row, matching the
    // schema default rather than relying on Mongo's "missing == null" index
    // behavior indefinitely.
    const backfill = await collection.updateMany({ isMakeup: { $exists: false } }, { $set: { isMakeup: false } });
    if (backfill.modifiedCount) {
      console.log(`  backfilled isMakeup:false on ${backfill.modifiedCount} existing document(s).`);
    } else {
      console.log('  no documents needed isMakeup backfilled.');
    }

    const oldIndex = indexes.find((i) => sameKey(i.key, OLD_INDEX_KEY) && i.unique);
    if (oldIndex) {
      await collection.dropIndex(oldIndex.name);
      console.log(`  dropped stale index: ${oldIndex.name}`);
    } else {
      console.log('  no stale 2-field unique index found (already migrated, or collection is new).');
    }
  }

  const hasNewIndex = indexes.some((i) => sameKey(i.key, NEW_INDEX_KEY) && i.unique);
  if (!hasNewIndex) {
    await collection.createIndex(NEW_INDEX_KEY, { unique: true });
    console.log('  created new unique index on { ongoingClassId, date, isMakeup }.');
  } else {
    console.log('  new 3-field unique index already exists.');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

fixAttendanceIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});
