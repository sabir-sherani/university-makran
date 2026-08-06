// One-off audit script: scans existing Student / Teacher / HOD / ExaminationStaff /
// FinanceStaff / Employee / Admission records against the validation rules now
// enforced on write, and PRINTS every record that violates them. It does NOT
// modify or delete anything — use the printed report to fix data by hand.
//
// Usage: node scripts/flagInvalidRecords.js
const mongoose = require('mongoose');
require('dotenv').config();

const {
  REGISTRATION_NO_REGEX, CNIC_REGEX, PHONE_REGEX, NAME_REGEX, MIN_AGE_YEARS, MAX_AGE_YEARS,
} = require('../validators/fields');
const {
  GENDER, TIME_SESSION, STUDENT_STATUS, TEACHER_STATUS, STAFF_STATUS, ADMISSION_STATUS, EMPLOYEE_STATUS,
} = require('../validators/enums');

const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const HOD = require('../models/HOD');
const ExaminationStaff = require('../models/ExaminationStaff');
const FinanceStaff = require('../models/FinanceStaff');
const Employee = require('../models/Employee');
const Admission = require('../models/Admission');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function checkName(value, label, problems) {
  if (value == null || value === '') return;
  const v = String(value).trim();
  if (v.length < 3 || v.length > 60) problems.push(`${label} must be 3-60 characters (got "${v}").`);
  else if (!NAME_REGEX.test(v)) problems.push(`${label} must contain only letters, spaces, dots, and hyphens (got "${v}").`);
}

function checkEmail(value, problems, label = 'email') {
  if (value == null || value === '') return;
  if (!EMAIL_REGEX.test(String(value).trim())) problems.push(`${label} is not a valid email (got "${value}").`);
}

function checkCnic(value, problems, label = 'cnic') {
  if (value == null || value === '') return;
  if (!CNIC_REGEX.test(String(value).trim())) problems.push(`${label} must match 12345-1234567-1 (got "${value}").`);
}

function checkPhone(value, problems, label = 'phone') {
  if (value == null || value === '') return;
  if (!PHONE_REGEX.test(String(value).trim())) problems.push(`${label} is not a valid Pakistani mobile number (got "${value}").`);
}

function checkRegistrationNo(value, problems) {
  if (value == null || value === '') { problems.push('registrationNo is missing.'); return; }
  if (!REGISTRATION_NO_REGEX.test(String(value).trim())) problems.push(`registrationNo must match UOM-YYYY-NNNN (got "${value}").`);
}

function checkEnum(value, allowed, label, problems, { optional = true } = {}) {
  if (value == null || value === '') { if (!optional) problems.push(`${label} is missing.`); return; }
  if (!allowed.includes(value)) problems.push(`${label} must be one of: ${allowed.join(', ')} (got "${value}").`);
}

function checkDob(value, label, problems) {
  if (value == null || value === '') return;
  const d = new Date(value);
  if (isNaN(d.getTime())) { problems.push(`${label} is not a valid date (got "${value}").`); return; }
  if (d >= new Date()) { problems.push(`${label} must be in the past (got "${value}").`); return; }
  const age = (Date.now() - d.getTime()) / MS_PER_YEAR;
  if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
    problems.push(`${label} implies age ${age.toFixed(1)}, outside allowed range ${MIN_AGE_YEARS}-${MAX_AGE_YEARS} (got "${value}").`);
  }
}

function report(modelLabel, records) {
  if (!records.length) {
    console.log(`\n${modelLabel}: no violations found (${records.length} flagged).`);
    return;
  }
  console.log(`\n${modelLabel}: ${records.length} record(s) with violations`);
  console.log('─'.repeat(60));
  records.forEach(({ id, identifier, problems }) => {
    console.log(`  [${id}] ${identifier}`);
    problems.forEach((p) => console.log(`      - ${p}`));
  });
}

async function auditStudents() {
  const docs = await Student.find().lean();
  const flagged = [];
  docs.forEach((s) => {
    const problems = [];
    checkRegistrationNo(s.registrationNo, problems);
    checkName(s.fullName, 'fullName', problems);
    checkEmail(s.email, problems);
    checkPhone(s.phone, problems);
    checkCnic(s.cnic, problems);
    checkName(s.fatherName, 'fatherName', problems);
    checkEnum(s.gender, GENDER, 'gender', problems);
    checkDob(s.dateOfBirth, 'dateOfBirth', problems);
    checkEnum(s.timeSession, TIME_SESSION, 'timeSession', problems);
    checkEnum(s.status, STUDENT_STATUS, 'status', problems, { optional: false });
    if (problems.length) flagged.push({ id: s._id, identifier: `${s.registrationNo || '(no reg no)'} — ${s.fullName || '(no name)'}`, problems });
  });
  report('Student', flagged);
}

async function auditTeachers() {
  const docs = await Teacher.find().lean();
  const flagged = [];
  docs.forEach((t) => {
    const problems = [];
    if (!t.teacherId) problems.push('teacherId is missing.');
    checkName(t.fullName, 'fullName', problems);
    checkEmail(t.email, problems);
    checkPhone(t.phone, problems);
    checkCnic(t.cnic, problems);
    checkEnum(t.status, TEACHER_STATUS, 'status', problems, { optional: false });
    if (problems.length) flagged.push({ id: t._id, identifier: `${t.teacherId || '(no id)'} — ${t.fullName || '(no name)'}`, problems });
  });
  report('Teacher', flagged);
}

async function auditStaff(Model, idField, modelLabel) {
  const docs = await Model.find().lean();
  const flagged = [];
  docs.forEach((doc) => {
    const problems = [];
    if (!doc[idField]) problems.push(`${idField} is missing.`);
    checkName(doc.fullName, 'fullName', problems);
    checkEmail(doc.email, problems);
    checkPhone(doc.phone, problems);
    checkCnic(doc.cnic, problems);
    checkEnum(doc.status, STAFF_STATUS, 'status', problems, { optional: false });
    if (problems.length) flagged.push({ id: doc._id, identifier: `${doc[idField] || '(no id)'} — ${doc.fullName || '(no name)'}`, problems });
  });
  report(modelLabel, flagged);
}

async function auditEmployees() {
  const docs = await Employee.find().lean();
  const flagged = [];
  docs.forEach((e) => {
    const problems = [];
    if (!e.empId) problems.push('empId is missing.');
    checkName(e.name, 'name', problems);
    checkEmail(e.email, problems);
    checkPhone(e.phone, problems);
    checkEnum(e.status, EMPLOYEE_STATUS, 'status', problems, { optional: false });
    if (problems.length) flagged.push({ id: e._id, identifier: `${e.empId || '(no id)'} — ${e.name || '(no name)'}`, problems });
  });
  report('Employee', flagged);
}

async function auditAdmissions() {
  const docs = await Admission.find().lean();
  const flagged = [];
  docs.forEach((a) => {
    const problems = [];
    checkName(a.candidateName, 'candidateName', problems);
    checkName(a.fatherName, 'fatherName', problems);
    checkEmail(a.email, problems);
    checkCnic(a.cnic, problems);
    checkDob(a.dob, 'dob', problems);
    checkEnum(a.gender, GENDER, 'gender', problems, { optional: false });
    checkPhone(a.phone, problems);
    checkPhone(a.whatsapp, problems, 'whatsapp');
    checkEnum(a.status, ADMISSION_STATUS, 'status', problems, { optional: false });
    if (problems.length) flagged.push({ id: a._id, identifier: `${a.candidateName || '(no name)'} — ${a.cnic || '(no cnic)'}`, problems });
  });
  report('Admission', flagged);
}

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);
  console.log('Scanning for records that violate current validation rules. Nothing will be modified or deleted.\n');

  await auditStudents();
  await auditTeachers();
  await auditStaff(HOD, 'hodId', 'HOD');
  await auditStaff(ExaminationStaff, 'examId', 'ExaminationStaff');
  await auditStaff(FinanceStaff, 'financeId', 'FinanceStaff');
  await auditEmployees();
  await auditAdmissions();

  console.log('\nDone. Review the records above and fix them manually (this script made no changes).');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
