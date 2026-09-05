// Shared by all four timetable read endpoints (HOD, teacher, student, admin —
// see routes/hodPortal.js, teacherPortal.js, studentPortal.js, adminPortal.js)
// so there is exactly one implementation of "turn a flat list of
// TimetableSlot documents into a days x sessions grid the frontend can render".
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildGrid(slots) {
  const byDay = {};
  DAYS.forEach((d) => { byDay[d] = []; });
  for (const slot of slots) {
    if (!byDay[slot.day]) byDay[slot.day] = [];
    byDay[slot.day].push(slot);
  }
  Object.values(byDay).forEach((rows) => rows.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))));
  return { days: DAYS, byDay };
}

// OngoingClass.semester is a free-text field ("3", "Semester 3", ...) —
// pulls the first integer out of it. Same rule teacherPortal.js already uses
// for roster matching (fetchApprovedRoster / findUnknownStudents), reused
// here instead of re-deriving it a third time for the timetable.
function parseSemesterNumber(semesterLike) {
  const match = String(semesterLike || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function sectionKeyFor({ programId, semesterNumber, timeSession }) {
  return `${programId}:${semesterNumber}:${timeSession}`;
}

module.exports = { DAYS, buildGrid, parseSemesterNumber, sectionKeyFor };
