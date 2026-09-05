// Seeds the university-wide (departmentId: null) default CreditHourPolicy
// documents. Idempotent — upserts by {departmentId: null, creditHours, isLab},
// safe to re-run. HODs can add department-specific overrides afterward via
// PATCH /api/portal/hod/credit-hour-policies; this script only ever touches
// the university-wide defaults, never a department's override.
//
// Usage: node scripts/seedCreditHourPolicies.js
const mongoose = require('mongoose');
require('dotenv').config();

const CreditHourPolicy = require('../models/CreditHourPolicy');

// The client's stated rules for 3CR and 4CR are called out explicitly in the
// comments below; the rest follow the same "90min theory blocks once you're
// at 3+ credit hours" pattern except where a lab component is present.
const DEFAULTS = [
  { creditHours: 1, isLab: false, sessions: [{ kind: 'theory', durationMinutes: 60, count: 1 }] },
  { creditHours: 2, isLab: false, sessions: [{ kind: 'theory', durationMinutes: 60, count: 2 }] },
  // Client's stated rule: 3 credit hours, no lab -> 2 x 90min theory.
  { creditHours: 3, isLab: false, sessions: [{ kind: 'theory', durationMinutes: 90, count: 2 }] },
  { creditHours: 3, isLab: true, sessions: [{ kind: 'theory', durationMinutes: 90, count: 2 }] },
  { creditHours: 4, isLab: false, sessions: [{ kind: 'theory', durationMinutes: 120, count: 2 }] },
  // Client's stated rule: 4 credit hours with lab -> 2 x 90min theory + 1 x 60min lab.
  { creditHours: 4, isLab: true, sessions: [
    { kind: 'theory', durationMinutes: 90, count: 2 },
    { kind: 'lab', durationMinutes: 60, count: 1 },
  ] },
];

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);

  let created = 0, updated = 0;
  for (const def of DEFAULTS) {
    const existing = await CreditHourPolicy.findOne({ departmentId: null, creditHours: def.creditHours, isLab: def.isLab });
    await CreditHourPolicy.findOneAndUpdate(
      { departmentId: null, creditHours: def.creditHours, isLab: def.isLab },
      { $set: { department: '', sessions: def.sessions, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (existing) updated++; else created++;
    console.log(`  ${def.creditHours}cr${def.isLab ? ' (lab)' : ''}: ${def.sessions.map(s => `${s.count}x${s.durationMinutes}min ${s.kind}`).join(' + ')}`);
  }

  console.log(`\nCreated ${created}, updated ${updated} university-wide default polic${created + updated === 1 ? 'y' : 'ies'}.`);
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
