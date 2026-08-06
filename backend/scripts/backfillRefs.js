// One-off migration: maps existing department/program/session/designation
// free-text strings on Student, Teacher, HOD, ExaminationStaff, FinanceStaff,
// FeeChallan, DateSheet, Result, ResultSheet, OngoingClass and Assignment to
// the matching official record (case-insensitive exact match) and fills in
// the new *Id ref field. Values that don't match any official record are
// left untouched and reported at the end — fix the data or add the missing
// official record, then re-run.
//
// Usage: node scripts/backfillRefs.js
const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const HOD = require('../models/HOD');
const ExaminationStaff = require('../models/ExaminationStaff');
const FinanceStaff = require('../models/FinanceStaff');
const FeeChallan = require('../models/FeeChallan');
const DateSheet = require('../models/DateSheet');
const Result = require('../models/Result');
const ResultSheet = require('../models/ResultSheet');
const OngoingClass = require('../models/OngoingClass');
const Assignment = require('../models/Assignment');

const Department = require('../models/Department');
const Program = require('../models/Program');
const AcademicSession = require('../models/AcademicSession');
const Designation = require('../models/Designation');

function normalize(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

// Builds a normalized-name -> _id map from every record of Model (active or
// not — the goal is to find *a* matching official record, whatever its
// current status; admins can review/reactivate afterward if needed).
async function buildMap(Model, field) {
  const docs = await Model.find().select(`_id ${field}`).lean();
  const map = new Map();
  docs.forEach((d) => {
    const key = normalize(d[field]);
    if (key && !map.has(key)) map.set(key, d._id);
  });
  return map;
}

// Fills idField on every document of Model that has strField set but no
// idField yet. Records unmatched values (grouped, with counts) into `unmatched`.
async function backfillField(Model, modelLabel, idField, strField, lookupMap, unmatched) {
  const filter = {
    $or: [{ [idField]: { $exists: false } }, { [idField]: null }],
    [strField]: { $exists: true, $nin: [null, ''] },
  };
  const docs = await Model.find(filter).select(`_id ${strField}`).lean();
  let matched = 0;
  for (const doc of docs) {
    const id = lookupMap.get(normalize(doc[strField]));
    if (id) {
      await Model.updateOne({ _id: doc._id }, { $set: { [idField]: id } });
      matched++;
    } else {
      const bucket = `${modelLabel}.${strField}`;
      if (!unmatched.has(bucket)) unmatched.set(bucket, new Map());
      const valueMap = unmatched.get(bucket);
      valueMap.set(doc[strField], (valueMap.get(doc[strField]) || 0) + 1);
    }
  }
  console.log(`${modelLabel}.${idField}: backfilled ${matched}/${docs.length}`);
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);

  const deptMap = await buildMap(Department, 'name');
  const progMap = await buildMap(Program, 'title');
  const sessMap = await buildMap(AcademicSession, 'name');
  const desigMap = await buildMap(Designation, 'title');

  console.log(`Loaded ${deptMap.size} departments, ${progMap.size} programs, ${sessMap.size} sessions, ${desigMap.size} designations.\n`);

  const unmatched = new Map();

  const targets = [
    { Model: Student, label: 'Student', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'session', sessMap],
    ] },
    { Model: Teacher, label: 'Teacher', refs: [
      ['departmentId', 'department', deptMap],
      ['designationId', 'designation', desigMap],
    ] },
    { Model: HOD, label: 'HOD', refs: [
      ['departmentId', 'department', deptMap],
      ['designationId', 'designation', desigMap],
    ] },
    { Model: ExaminationStaff, label: 'ExaminationStaff', refs: [
      ['designationId', 'designation', desigMap],
    ] },
    { Model: FinanceStaff, label: 'FinanceStaff', refs: [
      ['departmentId', 'department', deptMap],
      ['designationId', 'designation', desigMap],
    ] },
    { Model: FeeChallan, label: 'FeeChallan', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'academicSession', sessMap],
    ] },
    { Model: DateSheet, label: 'DateSheet', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'session', sessMap],
    ] },
    { Model: Result, label: 'Result', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'session', sessMap],
    ] },
    { Model: ResultSheet, label: 'ResultSheet', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'academicSession', sessMap],
    ] },
    { Model: OngoingClass, label: 'OngoingClass', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'academicSession', sessMap],
    ] },
    { Model: Assignment, label: 'Assignment', refs: [
      ['departmentId', 'department', deptMap],
      ['programId', 'program', progMap],
      ['sessionId', 'academicSession', sessMap],
    ] },
  ];

  for (const t of targets) {
    for (const [idField, strField, map] of t.refs) {
      await backfillField(t.Model, t.label, idField, strField, map, unmatched);
    }
  }

  if (unmatched.size) {
    console.log('\n── Unmatched values — no official record found. Fix the source data or add the missing official record, then re-run. ──');
    for (const [bucket, valueMap] of unmatched) {
      console.log(`\n${bucket}:`);
      for (const [value, count] of valueMap) {
        console.log(`  "${value}" — ${count} record(s)`);
      }
    }
  } else {
    console.log('\nNo unmatched values — every resolvable row now has an official id.');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
