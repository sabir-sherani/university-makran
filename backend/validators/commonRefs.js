// Convenience wrappers around resolveRef() for the fields almost every
// write route needs: departmentId, programId, sessionId, semesterId. Each
// resolves against the canonical collection and rejects unknown/inactive ids.
const Department = require('../models/Department');
const Program = require('../models/Program');
const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const Designation = require('../models/Designation');
const Course = require('../models/Course');
const Room = require('../models/Room');
const { resolveRef } = require('./resolveRef');
const { DEPARTMENT_ACTIVE, PROGRAM_ACTIVE, SESSION_ACTIVE, SEMESTER_ACTIVE, DESIGNATION_ACTIVE, COURSE_ACTIVE, ROOM_ACTIVE } = require('./refFilters');

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
function courseRef(opts = {}) {
  return resolveRef('courseId', Course, 'course', { activeFilter: COURSE_ACTIVE, label: 'courseId', ...opts });
}
function roomRef(opts = {}) {
  return resolveRef('roomId', Room, 'room', { activeFilter: ROOM_ACTIVE, label: 'roomId', ...opts });
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
  // Written as `subject` (not `courseTitle`) — that's the existing free-text
  // field name every subject consumer (OngoingClass, Attendance, ResultSheet,
  // the whole result-sheet UI) already reads, so picking a course by id keeps
  // working with every one of them unchanged.
  if (r.course) { data.courseId = r.course._id; data.courseCode = r.course.code; data.subject = r.course.title; }
  // Written as `room` (not `roomName`) — the existing free-text room field
  // every OngoingClass consumer already reads, so picking a room by id keeps
  // every existing display unchanged.
  if (r.room) { data.roomId = r.room._id; data.room = r.room.code ? `${r.room.code} — ${r.room.name}` : r.room.name; }
  return data;
}

module.exports = { departmentRef, programRef, sessionRef, semesterRef, designationRef, courseRef, roomRef, snapshotRefs };
