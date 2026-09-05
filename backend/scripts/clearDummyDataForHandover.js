// One-off cleanup for handing over a clean website: wipes every dummy/demo
// account and transactional record created during development, plus the
// audit-log history, while leaving the admin login and all real structural/
// catalog data (departments, programs, courses, credit-hour policies, rooms,
// academic sessions) and public-site content (news, gallery, feedback, etc.)
// untouched. Writes a full JSON backup of everything it deletes before
// deleting it, so this is recoverable if run by mistake.
//
// Usage: node scripts/clearDummyDataForHandover.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Accounts + everything transactionally tied to them, plus the audit trail.
// Deliberately NOT included: admins, departments, programs, courses,
// semestercourses, credithourpolicies, rooms, deptsettings, academicsessions,
// semesters, designations, administrationdepts, counters, and public-site
// content (news/galleries/feedbacks/contacts/admissioncontents/
// admissionnotices/facilities/scholarships).
const COLLECTIONS_TO_CLEAR = [
  'students', 'teachers', 'hods', 'financestaffs', 'examinationstaffs',
  'correctionrequests', 'ongoingclasses', 'deptnotices', 'attendances',
  'feechallans', 'feerecords', 'resultsheets', 'results',
  'assignments', 'assignmentsubmissions', 'admissions', 'degrees',
  'degreeverifications', 'notifications', 'suspensionotps', 'teacheridslots',
  'auditlogs',
];

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);

  const db = mongoose.connection.db;
  const backupPath = path.join(__dirname, `../backup-before-handover-${Date.now()}.json`);

  const backup = {};
  let totalDocs = 0;
  console.log('\nBacking up before deleting anything:');
  for (const name of COLLECTIONS_TO_CLEAR) {
    const docs = await db.collection(name).find({}).toArray();
    backup[name] = docs;
    totalDocs += docs.length;
    console.log(`  ${name}: ${docs.length} doc(s)`);
  }
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\nBackup written to ${backupPath} (${totalDocs} total documents). Keep this until you're sure you don't need it.`);

  console.log('\nDeleting:');
  for (const name of COLLECTIONS_TO_CLEAR) {
    const result = await db.collection(name).deleteMany({});
    console.log(`  ${name}: ${result.deletedCount} deleted`);
  }

  console.log('\nUntouched (verifying they still have their real data):');
  for (const name of ['admins', 'departments', 'programs', 'courses', 'rooms', 'credithourpolicies', 'deptsettings', 'academicsessions', 'news', 'galleries']) {
    const count = await db.collection(name).countDocuments();
    console.log(`  ${name}: ${count}`);
  }

  await mongoose.disconnect();
  console.log('\nDone. The site now has zero dummy accounts and an empty audit log, with your admin login and all real structural/catalog data intact.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
