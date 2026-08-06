// Convenience wrappers around resolveRef() for the fields almost every
// write route needs: departmentId, programId, sessionId, semesterId. Each
// resolves against the canonical collection and rejects unknown/inactive ids.
const Department = require('../models/Department');
const Program = require('../models/Program');
const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const Designation = require('../models/Designation');
const { resolveRef } = require('./resolveRef');
const { DEPARTMENT_ACTIVE, PROGRAM_ACTIVE, SESSION_ACTIVE, SEMESTER_ACTIVE, DESIGNATION_ACTIVE } = require('./refFilters');

function departmentRef(opts = {}) {
  return resolveRef('departmentId', Department, 'department', { activeFilter: DEPARTMENT_ACTIVE, label: 'departmentId', ...opts });
}
function programRef(opts = {}) {
  return resolveRef('programId', Program, 'program', { activeFilter: PROGRAM_ACTIVE, label: 'programId', ...opts });
}
function sessionRef(opts = {}) {
  return resolveRef('sessionId', AcademicSession, 'session', { activeFilter: SESSION_ACTIVE, label: 'sessionId', ...opts });
}
function semesterRef(opts = {}) {
  return resolveRef('semesterId', Semester, 'semester', { activeFilter: SEMESTER_ACTIVE, label: 'semesterId', ...opts });
}
function designationRef(opts = {}) {
  return resolveRef('designationId', Designation, 'designation', { activeFilter: DESIGNATION_ACTIVE, label: 'designationId', ...opts });
}

// Snapshots resolved refs' display names onto a plain data object using the
// legacy string field names (department/program/session/semester/designation).
function snapshotRefs(req, data) {
  const r = req.resolvedRefs || {};
  if (r.department) { data.departmentId = r.department._id; data.department = r.department.name; }
  if (r.program) { data.programId = r.program._id; data.program = r.program.title; }
  // Written under both field-name conventions in use across models —
  // DateSheet uses `session`, FeeStructure/FeeChallan/ResultSheet use
  // `academicSession`; whichever one a given schema doesn't define is
  // silently dropped by Mongoose, so writing both is safe everywhere.
  if (r.session) { data.sessionId = r.session._id; data.session = r.session.name; data.academicSession = r.session.name; }
  if (r.semester) { data.semesterId = r.semester._id; data.semester = r.semester.name; }
  if (r.designation) { data.designationId = r.designation._id; data.designation = r.designation.title; }
  return data;
}

module.exports = { departmentRef, programRef, sessionRef, semesterRef, designationRef, snapshotRefs };
