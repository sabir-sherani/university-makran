// One-off migration: reads every SemesterCourse document (per-program,
// per-semester course lists maintained on the admin Courses page) and
// upserts the corresponding canonical Course record for each course item.
// Idempotent — re-running matches existing Course docs by {programId, code}
// and updates them in place rather than duplicating. Does NOT touch or
// delete SemesterCourse — routes/courses.js and the public department pages
// still read/write it directly; keep the two in sync going forward from
// routes/courses.js's own write path (see courseRef()/Course.syncFrom there).
//
// Usage:
//   node scripts/migrateSemesterCoursesToCourses.js --dry-run   (prints the plan, writes nothing)
//   node scripts/migrateSemesterCoursesToCourses.js             (applies it)
const mongoose = require('mongoose');
require('dotenv').config();

const SemesterCourse = require('../models/SemesterCourse');
const Program = require('../models/Program');
const Department = require('../models/Department');
const Course = require('../models/Course');

const DRY_RUN = process.argv.includes('--dry-run');

// "3+0" -> not lab, "2+1" / "2-1" -> lab (any non-zero second number).
function parseIsLab(theoryLab) {
  const match = String(theoryLab || '').match(/^\s*(\d+)\s*[+\-]\s*(\d+)\s*$/);
  if (!match) return false;
  return Number(match[2]) > 0;
}

function slugCode(title, fallbackSuffix) {
  const base = String(title || 'COURSE')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 10) || 'COURSE';
  return `${base}-${fallbackSuffix}`;
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);
  console.log(DRY_RUN ? 'DRY RUN — no writes will be made.\n' : 'LIVE RUN — writes will be made.\n');

  const semCourses = await SemesterCourse.find().populate('program', 'title department departmentId');
  console.log(`Found ${semCourses.length} SemesterCourse document(s).\n`);

  const departments = await Department.find().select('name');
  const deptNameById = new Map(departments.map((d) => [String(d._id), d.name]));

  let planned = 0, created = 0, updated = 0, skipped = 0;
  const usedCodes = new Set(); // programId::code seen this run, to dedupe missing/blank codes within one semester

  for (const sc of semCourses) {
    const program = sc.program; // populated Program doc, or null if dangling ref
    if (!program) {
      console.log(`  ! Skipping SemesterCourse ${sc._id} — program ${sc.program} no longer exists.`);
      skipped += (sc.courses || []).length;
      continue;
    }
    const departmentId = program.department || program.departmentId || null;

    for (const [idx, item] of (sc.courses || []).entries()) {
      if (!item.courseTitle?.trim()) { skipped++; continue; }

      let code = String(item.code || '').trim().toUpperCase();
      const dedupeKey = `${program._id}::${sc.semesterNumber}::${idx}`;
      if (!code || usedCodes.has(`${program._id}::${code}`)) {
        code = slugCode(item.courseTitle, `S${sc.semesterNumber}-${idx + 1}`);
      }
      usedCodes.add(`${program._id}::${code}`);

      const doc = {
        code,
        title: item.courseTitle.trim(),
        creditHours: Math.min(6, Math.max(1, Number(item.creditHours) || 3)),
        isLab: parseIsLab(item.theoryLab),
        program: program.title || '',
        programId: program._id,
        department: departmentId ? (deptNameById.get(String(departmentId)) || '') : '',
        departmentId,
        semesterNumber: sc.semesterNumber,
        isActive: true,
      };

      planned++;
      if (DRY_RUN) {
        console.log(`  [plan] ${doc.programId} sem${doc.semesterNumber} ${doc.code} — "${doc.title}" (${doc.creditHours}cr${doc.isLab ? ', lab' : ''}) [${dedupeKey}]`);
        continue;
      }

      const existing = await Course.findOne({ programId: doc.programId, code: doc.code });
      await Course.findOneAndUpdate(
        { programId: doc.programId, code: doc.code },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (existing) updated++; else created++;
    }
  }

  console.log(`\n${DRY_RUN ? 'Would process' : 'Processed'} ${planned} course row(s).`);
  if (!DRY_RUN) console.log(`Created ${created}, updated ${updated}, skipped ${skipped} (blank titles / dangling program refs).`);
  else console.log(`Skipped ${skipped} (blank titles / dangling program refs) — re-run without --dry-run to apply.`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
