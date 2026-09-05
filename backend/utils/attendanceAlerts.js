// Absence-alert dispatch (Phase 3) — the one place that turns a saved
// Attendance session into student notifications, so POST and PATCH
// /api/portal/teacher/attendance both call this instead of each re-typing the
// same DeptSetting lookup + Student resolution + notify() wiring.
const Student = require('../models/Student');
const DeptSetting = require('../models/DeptSetting');
const Notification = require('../models/Notification');
const { notifyMany } = require('./notify');
const { summarizeSessions } = require('./attendanceSummary');

// Used when the OngoingClass has no departmentId/sessionId (legacy rows) —
// DeptSetting.getOrDefault() can't be called without both ids, and alerts
// should still fire with sane defaults rather than silently doing nothing.
const DEFAULT_DEPT_SETTING = {
  absenceAlertEnabled: true,
  alsoAlertOnLate: false,
  attendanceCorrectionWindowDays: 14,
};

// Called after a successful Attendance save (create or update). Never throws —
// an email/DB hiccup here must not undo an already-saved attendance sheet —
// and returns the number of notifications actually created so the route can
// report `{ notified: n }` back to the teacher.
async function dispatchAbsenceAlerts({ session, ongoingClass }) {
  try {
    let deptSetting = DEFAULT_DEPT_SETTING;
    if (ongoingClass?.departmentId && ongoingClass?.sessionId) {
      deptSetting = await DeptSetting.getOrDefault(ongoingClass.departmentId, ongoingClass.sessionId);
    }
    if (!deptSetting.absenceAlertEnabled) return 0;

    const statuses = deptSetting.alsoAlertOnLate ? ['Absent', 'Late'] : ['Absent'];
    const targets = (session.records || []).filter((r) => statuses.includes(r.status));
    if (!targets.length) return 0;

    const regNos = [...new Set(targets.map((r) => r.registrationNo))];
    const students = await Student.find({ registrationNo: { $in: regNos } }).select('_id registrationNo');
    const byReg = new Map(students.map((s) => [s.registrationNo, s]));
    const windowDays = deptSetting.attendanceCorrectionWindowDays || 14;

    const items = [];
    for (const r of targets) {
      const student = byReg.get(r.registrationNo);
      if (!student) continue; // no matching student record — nothing to notify
      items.push({
        recipientRole: 'student',
        recipient: student._id,
        category: 'attendance',
        priority: 'normal',
        title: `Marked ${r.status.toLowerCase()} — ${session.subject}`,
        body: `You were marked ${r.status.toLowerCase()} in ${session.subject} (${session.className}) on ${new Date(session.date).toDateString()}. If this is incorrect, submit an attendance correction request with supporting documents within ${windowDays} days.`,
        link: '/portal/student?tab=dashboard',
        entityType: 'Attendance',
        entityId: session._id,
        // Keyed by attendanceId + registrationNo, not status — editing the
        // sheet later (even flipping the status) never re-alerts for a
        // student already notified about this exact session.
        dedupeKey: `absence:${session._id}:${r.registrationNo}`,
      });
    }
    if (!items.length) return 0;

    // notify() is dedupeKey-idempotent — calling it again for a student
    // already notified about this exact session is a silent no-op, not an
    // error, so notifyMany()'s success/error split alone can't tell "newly
    // notified" from "already had this one." Snapshot which keys already
    // exist first so the returned count reflects only genuinely new alerts
    // (what POST/PATCH /attendance report back as `{ notified: n }`).
    const dedupeKeys = items.map((i) => i.dedupeKey);
    const preexisting = new Set(
      (await Notification.find({ dedupeKey: { $in: dedupeKeys } }).select('dedupeKey')).map((d) => d.dedupeKey)
    );

    const results = await notifyMany(items);
    return results.filter((r, i) => r && !r.error && !preexisting.has(items[i].dedupeKey)).length;
  } catch (err) {
    console.error('[attendanceAlerts] dispatch failed:', err.message);
    return 0;
  }
}

// ── Threshold alerts — logic only, for the daily-job runner ─────────────────
// Phase 3 asks for these to run inside "the daily job (Phase 4's runner)".
// That runner (backend/jobs/dailyJobs.js) doesn't exist yet — it's Phase 4's
// own deliverable — so these are exposed as pure, importable functions ready
// for dailyJobs.js to call once it exists, rather than this phase reaching
// ahead to build Phase 4's scheduler.

// sessions: Attendance documents for ONE ongoing class, oldest first. Returns
// students whose most recent `threshold` sessions are ALL Absent (i.e. they
// are absent right now, not just at some point in the past).
function detectConsecutiveAbsences(sessions, { threshold = 3 } = {}) {
  const byStudent = new Map(); // registrationNo -> { studentName, streak }
  for (const session of sessions) {
    for (const r of session.records || []) {
      const entry = byStudent.get(r.registrationNo) || { studentName: r.studentName, streak: 0 };
      entry.streak = r.status === 'Absent' ? entry.streak + 1 : 0;
      entry.studentName = r.studentName;
      byStudent.set(r.registrationNo, entry);
    }
  }
  return Array.from(byStudent.entries())
    .filter(([, v]) => v.streak >= threshold)
    .map(([registrationNo, v]) => ({ registrationNo, studentName: v.studentName, consecutiveAbsences: v.streak }));
}

// sessions: Attendance documents for ONE ongoing class. Returns students whose
// overall attendance % (via attendanceSummary.summarizeSessions — the same
// number the dashboards show) is below minPercent.
function detectBelowThreshold(sessions, { minPercent = 75 } = {}) {
  return summarizeSessions(sessions).filter((row) => row.attendancePercent < minPercent);
}

module.exports = { dispatchAbsenceAlerts, detectConsecutiveAbsences, detectBelowThreshold };
