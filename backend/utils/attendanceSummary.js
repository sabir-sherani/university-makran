// Single source of truth for attendance-percentage math — this used to be
// computed twice (routes/studentPortal.js's dashboard and routes/
// teacherPortal.js's GET /attendance/report), with the same rule typed out
// independently in each place. Both now import this instead.
//
// Attendance rule: a session record counts as "attended" when its status is
// Present or Late. Absent does not count. Excused simply doesn't count as
// attended, matching the pre-existing behavior in both call sites before this
// refactor. A make-up session (Attendance.isMakeup, added in Phase 3) is not
// special-cased here — its records count exactly like a regular session's
// (Present/Late attended, Absent/Excused not) since a make-up class is a real
// class, just held on a different day. Its only distinguishing behavior is
// display: see formatMakeupLabel() below.

// sessions: Attendance documents (each with a `records` array). Returns one
// summary row per student across ALL the given sessions — this is what
// teacherPortal.js's per-class report needs (all sessions belong to one class).
function summarizeSessions(sessions) {
  const map = new Map();
  for (const session of sessions) {
    for (const r of session.records || []) {
      if (!map.has(r.registrationNo)) {
        map.set(r.registrationNo, {
          registrationNo: r.registrationNo, studentName: r.studentName,
          Present: 0, Absent: 0, Late: 0, Excused: 0, total: 0,
        });
      }
      const row = map.get(r.registrationNo);
      if (row[r.status] !== undefined) row[r.status]++;
      row.total++;
    }
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    attendancePercent: row.total ? Math.round(((row.Present + row.Late) / row.total) * 100) : 0,
  }));
}

// sessions: Attendance documents, already filtered to the ones relevant to
// one student (e.g. one registrationNo across possibly multiple classes).
// Returns a single overall percentage — what studentPortal.js's dashboard needs.
function overallPercent(sessions, registrationNo) {
  let attended = 0, total = 0;
  for (const session of sessions) {
    const rec = (session.records || []).find((r) => r.registrationNo === registrationNo);
    if (!rec) continue;
    total += 1;
    if (rec.status === 'Present' || rec.status === 'Late') attended += 1;
  }
  return total > 0 ? Math.round((attended / total) * 100) : null;
}

// Single source of truth for the make-up-class label (Phase 3) — every place
// that lists attendance sessions (teacher list, HOD view, student view,
// printed reports) renders make-up sessions through this one function instead
// of each re-deriving the wording independently.
function formatMakeupLabel(session) {
  if (!session?.isMakeup) return null;
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const heldOn = session.date ? fmt(session.date) : 'an unspecified date';
  const missedOn = session.makeupFor ? fmt(session.makeupFor) : 'an unspecified date';
  return `Make-up class (held ${heldOn}, for the class missed on ${missedOn})`;
}

module.exports = { summarizeSessions, overallPercent, formatMakeupLabel };
