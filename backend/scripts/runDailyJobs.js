// Manual/local invocation of the daily job runner — the same code path
// POST /api/jobs/daily uses (backend/jobs/dailyJobs.js), just without going
// through HTTP/JOB_SECRET. Safe to re-run: every notification it creates is
// deduped by a date-stamped dedupeKey, so running this multiple times in one
// day produces the same result as running it once.
//
// Usage: node scripts/runDailyJobs.js
const mongoose = require('mongoose');
require('dotenv').config();

const { runDailyJobs } = require('../jobs/dailyJobs');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);

  const summary = await runDailyJobs({ now: new Date() });

  console.log('\n── Daily jobs summary ──────────────────────────────');
  console.log(`  Document reminders sent : ${summary.documentReminders}`);
  console.log(`  Absence-threshold alerts: ${summary.absenceThresholdAlerts}`);
  console.log(`  Eligibility warnings    : ${summary.eligibilityWarnings}`);
  if (summary.errors.length) {
    console.log(`  Errors (${summary.errors.length}):`);
    summary.errors.forEach((e) => console.log(`    - ${e}`));
  } else {
    console.log('  Errors                  : none');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
