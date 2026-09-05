// Single source of truth for "which OngoingClass documents is this student
// enrolled in" — used to live only in routes/studentPortal.js (GET
// /ongoing-classes, GET /dashboard, GET /attendance); Phase 6's HOD-side
// per-student drill-down and exam-eligibility report need the exact same
// rule, so it's extracted here instead of being retyped a second time
// (hard rule 1 — do not duplicate logic).
const { escapeRegex } = require('./escapeRegex');

// Matches the OngoingClass documents a student is enrolled in — id-first
// (departmentId/sessionId), with a string-fallback for legacy classes that
// predate those refs.
function enrolledClassFilter(student) {
  const f = { status: 'active' };
  const and = [];

  // Match department: prefer the official id; fall back to an exact
  // (escaped) string match only for legacy classes with no departmentId.
  if (student?.departmentId) {
    and.push({ $or: [{ departmentId: student.departmentId }, {
      departmentId: { $exists: false },
      department: { $regex: `^${escapeRegex(student.department || '')}$`, $options: 'i' },
    }] });
  } else if (student?.department) {
    and.push({ departmentId: { $exists: false }, department: { $regex: `^${escapeRegex(student.department)}$`, $options: 'i' } });
  }

  // Match semester: student.currentSemester is a Number (e.g. 1),
  // OngoingClass.semester is a String (e.g. "Semester 1" or "1").
  // Use word-boundary regex so "1" matches "Semester 1" but not "11" or "12".
  if (student?.currentSemester) {
    and.push({ semester: { $regex: `\\b${escapeRegex(String(student.currentSemester))}\\b`, $options: 'i' } });
  }

  // Match academic session (student batch year e.g. "2025-2029")
  if (student?.sessionId) {
    and.push({ $or: [{ sessionId: student.sessionId }, {
      sessionId: { $exists: false },
      academicSession: { $regex: `^${escapeRegex(student.session || '')}$`, $options: 'i' },
    }] });
  } else if (student?.session) {
    and.push({ sessionId: { $exists: false }, academicSession: { $regex: `^${escapeRegex(student.session)}$`, $options: 'i' } });
  }

  // Match time session (Morning / Evening)
  if (student?.timeSession) f.timeSession = student.timeSession;

  if (and.length) f.$and = and;
  return f;
}

module.exports = { enrolledClassFilter };
