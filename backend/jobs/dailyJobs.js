// The one place "things nobody did in time" get turned into reminders — see
// PART 2 §4.1-4.2 of prompts/phase-4.md. Deployment is serverless-ish (no
// setInterval/node-cron in the request process), so this is a pure,
// re-runnable function: routes/jobs.js calls it from a secured HTTP endpoint,
// scripts/runDailyJobs.js calls it from the CLI — same code path either way.
//
// Every notification this creates carries a dedupeKey stamped with the date
// the job ran (see utils/notify.js — a duplicate dedupeKey is a silent
// no-op), so running this five times in one day produces exactly one alert
// per condition, and a condition that's still true tomorrow produces exactly
// one more.
const Department           = require('../models/Department');
const HOD                  = require('../models/HOD');
const Admin                = require('../models/Admin');
const ExaminationStaff     = require('../models/ExaminationStaff');
const OngoingClass         = require('../models/OngoingClass');
const TimetableSlot        = require('../models/TimetableSlot');
const Attendance           = require('../models/Attendance');
const ResultSheet          = require('../models/ResultSheet');
const DateSheet            = require('../models/DateSheet');
const Assignment           = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const CorrectionRequest    = require('../models/CorrectionRequest');
const Student              = require('../models/Student');
const DeptSetting          = require('../models/DeptSetting');
const Notification         = require('../models/Notification');

const { notify, notifyMany } = require('../utils/notify');
const { detectConsecutiveAbsences, detectBelowThreshold } = require('../utils/attendanceAlerts');
const { escapeRegex } = require('../utils/escapeRegex');

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

// Fixed escalation thresholds straight from the PART 2 §4.2 table — only the
// timetable-attendance rule's *initial* threshold (documentReminderHours) is
// HOD-configurable (it already was, via DeptSetting, before this phase); the
// escalation day-counts below are the client's stated numbers, not settings.
const TIMETABLE_ESCALATION_DAYS  = 3;
const ASSIGNMENT_ESCALATION_DAYS = 7;
const CORRECTION_TRIGGER_DAYS    = 3;
const CORRECTION_ESCALATION_DAYS = 7;

// DeptSetting.getOrDefault() requires real departmentId/sessionId — for a
// legacy row missing either, fall back to the schema's own defaults instead
// of letting an {departmentId: undefined} filter degrade into "match any
// document" (Mongo drops undefined filter keys, which would silently borrow
// a random department's thresholds).
const FALLBACK_SETTING = {
  minAttendancePercent: 75,
  consecutiveAbsenceAlertThreshold: 3,
  documentReminderHours: 48,
  resultSheetGraceDays: 3,
};

async function settingFor(departmentId, sessionId) {
  if (!departmentId || !sessionId) return FALLBACK_SETTING;
  return DeptSetting.getOrDefault(departmentId, sessionId);
}

// notify() is dedupeKey-idempotent by design (a duplicate is a silent no-op,
// never an error — see utils/notify.js), but that alone makes every call site
// here "successful" whether or not it actually created anything. Checking
// existence first lets the summary counters (and scripts/runDailyJobs.js's
// printed output) report genuinely NEW notifications, matching the same
// pattern utils/attendanceAlerts.js's dispatchAbsenceAlerts() already
// established for the exact same reason.
async function notifyIfNew(item) {
  const alreadyExisted = item.dedupeKey ? !!(await Notification.exists({ dedupeKey: item.dedupeKey })) : false;
  await notify(item);
  return alreadyExisted ? 0 : 1;
}

function toUTCMidnight(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function dateStamp(d) {
  return toUTCMidnight(d).toISOString().slice(0, 10);
}

// Most recent calendar date (UTC midnight) on or before `now` whose weekday
// matches `day` ('Monday', …). Returns null for an unrecognized day string.
function mostRecentWeekday(day, now) {
  const target = DAY_INDEX[day];
  if (target == null) return null;
  const d = toUTCMidnight(now);
  const diff = (d.getUTCDay() - target + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function normalize(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

async function loadActiveDepartmentIds() {
  const depts = await Department.find({ suspended: { $ne: true }, deletedAt: null }).select('_id').lean();
  return new Set(depts.map((d) => String(d._id)));
}

// ── Rule 1 — TimetableSlot occurred with no matching Attendance ────────────
// Scope note: only the single most recent qualifying occurrence of each slot
// is checked, not every past week it might have been missed — a slot more
// than a week overdue moves into the HOD-escalation path below rather than
// growing an ever-longer backlog of per-occurrence reminders for one slot.
async function collectTimetableAttendanceCandidates(now, activeDeptIds) {
  const slots = await TimetableSlot.find({ status: 'active' }).lean();
  if (!slots.length) return [];

  const settingCache = new Map();
  const hodCache = new Map();
  const out = [];

  for (const slot of slots) {
    if (!activeDeptIds.has(String(slot.departmentId))) continue;

    let occDate = mostRecentWeekday(slot.day, now);
    if (!occDate) continue;
    let occEnd = new Date(`${occDate.toISOString().slice(0, 10)}T${slot.endTime}:00.000Z`);
    if (occEnd > now) {
      occDate = new Date(occDate.getTime() - 7 * DAY_MS);
      occEnd = new Date(`${occDate.toISOString().slice(0, 10)}T${slot.endTime}:00.000Z`);
    }

    const settingKey = `${slot.departmentId}:${slot.sessionId}`;
    let setting = settingCache.get(settingKey);
    if (!setting) { setting = await settingFor(slot.departmentId, slot.sessionId); settingCache.set(settingKey, setting); }
    const thresholdMs = (setting.documentReminderHours || 48) * 60 * 60 * 1000;
    if (now - occEnd < thresholdMs) continue;

    const attendance = await Attendance.findOne({ ongoingClassId: slot.ongoingClass, date: occDate }).select('_id').lean();
    if (attendance) continue;

    const hodKey = String(slot.departmentId);
    let hod = hodCache.get(hodKey);
    if (hod === undefined) { hod = await HOD.findOne({ departmentId: slot.departmentId }).select('_id').lean(); hodCache.set(hodKey, hod); }

    const daysOverdue = Math.floor((now - occEnd) / DAY_MS);
    out.push({
      entityType: 'TimetableSlot', entityId: slot._id,
      recipientRole: 'teacher', recipientId: slot.teacher,
      title: `Attendance not marked — ${slot.subject}`,
      body: `No attendance record was found for ${slot.subject} (${slot.day} ${slot.startTime}-${slot.endTime}) held on ${occDate.toDateString()}. Please mark attendance for this session.`,
      link: '/portal/teacher?tab=attendance',
      escalate: daysOverdue >= TIMETABLE_ESCALATION_DAYS && !!hod,
      // HOD portal has no dedicated attendance-monitoring tab yet — the closest
      // existing section is Ongoing Classes (shows each teacher's assignments).
      escalationTargets: hod ? [{ role: 'hod', id: hod._id, tag: 'hod', link: '/portal/hod?tab=ongoingClasses' }] : [],
      escalationBody: `${slot.teacherName || 'A teacher'} has not marked attendance for ${slot.subject} (${slot.day} ${slot.startTime}-${slot.endTime}, ${occDate.toDateString()}) for ${daysOverdue}+ day(s).`,
    });
  }
  return out;
}

// ── Rule 2 — ResultSheet still in draft past DateSheet date + grace ────────
async function findExamDateForResultSheet(sheet) {
  if (!sheet.departmentId || !sheet.programId || !sheet.sessionId) return null;
  const dateSheets = await DateSheet.find({
    departmentId: sheet.departmentId, programId: sheet.programId, sessionId: sheet.sessionId,
    examType: sheet.examType, isPublished: true,
  }).select('examSchedule').lean();
  const target = normalize(sheet.subject);
  for (const ds of dateSheets) {
    const entry = (ds.examSchedule || []).find((e) => e.date && normalize(e.subject) === target);
    if (entry) return entry.date;
  }
  return null;
}

// The trigger condition itself already requires the grace period to have
// elapsed ("past its exam's DateSheet date + grace period"), so unlike the
// other three rules there's no separate later escalation day-count — HOD and
// Exam section are copied from the first day the reminder fires at all.
async function collectResultSheetCandidates(now, activeDeptIds, examStaffPool) {
  const sheets = await ResultSheet.find({ status: 'draft' }).lean();
  if (!sheets.length) return [];

  const settingCache = new Map();
  const hodCache = new Map();
  const out = [];

  for (const sheet of sheets) {
    if (!sheet.departmentId || !activeDeptIds.has(String(sheet.departmentId))) continue;
    const examDate = await findExamDateForResultSheet(sheet);
    if (!examDate) continue;

    const settingKey = `${sheet.departmentId}:${sheet.sessionId}`;
    let setting = settingCache.get(settingKey);
    if (!setting) { setting = await settingFor(sheet.departmentId, sheet.sessionId); settingCache.set(settingKey, setting); }
    const graceDays = setting.resultSheetGraceDays ?? 3;
    const dueAt = new Date(new Date(examDate).getTime() + graceDays * DAY_MS);
    if (now < dueAt) continue;

    const hodKey = String(sheet.departmentId);
    let hod = hodCache.get(hodKey);
    if (hod === undefined) { hod = await HOD.findOne({ departmentId: sheet.departmentId }).select('_id').lean(); hodCache.set(hodKey, hod); }

    const escalationTargets = [];
    if (hod) escalationTargets.push({ role: 'hod', id: hod._id, tag: 'hod', link: '/portal/hod?tab=results' });
    for (const staff of examStaffPool) {
      escalationTargets.push({ role: 'exam', id: staff._id, tag: `exam-${staff._id}`, link: '/portal/exam?tab=resultSheets' });
    }

    out.push({
      entityType: 'ResultSheet', entityId: sheet._id,
      recipientRole: 'teacher', recipientId: sheet.teacher,
      title: `Result sheet still in draft — ${sheet.subject}`,
      body: `The ${sheet.examType} result sheet for ${sheet.subject} (${sheet.semester}) is still in draft, more than ${graceDays} day(s) past the exam date. Please finalize it.`,
      link: '/portal/teacher?tab=results',
      escalate: escalationTargets.length > 0,
      escalationTargets,
      escalationBody: `${sheet.teacherName || 'A teacher'}'s ${sheet.examType} result sheet for ${sheet.subject} (${sheet.department}, ${sheet.semester}) is still in draft, more than ${graceDays} day(s) past the exam date.`,
    });
  }
  return out;
}

// ── Rule 3 — Assignment past due with ungraded submissions ─────────────────
async function collectAssignmentCandidates(now, activeDeptIds) {
  const assignments = await Assignment.find({ uploadedByRole: 'teacher', uploadedBy: { $ne: null }, dueDate: { $ne: null, $lt: now } }).lean();
  if (!assignments.length) return [];

  const hodCache = new Map();
  const out = [];

  for (const a of assignments) {
    if (a.departmentId && !activeDeptIds.has(String(a.departmentId))) continue;

    const ungraded = await AssignmentSubmission.countDocuments({ assignmentId: a._id, obtainedMarks: null });
    if (!ungraded) continue;

    const hodKey = String(a.departmentId);
    let hod = hodCache.get(hodKey);
    if (hod === undefined) { hod = a.departmentId ? await HOD.findOne({ departmentId: a.departmentId }).select('_id').lean() : null; hodCache.set(hodKey, hod); }

    const daysOverdue = Math.floor((now - new Date(a.dueDate)) / DAY_MS);
    out.push({
      entityType: 'Assignment', entityId: a._id,
      recipientRole: 'teacher', recipientId: a.uploadedBy,
      title: `${ungraded} ungraded submission(s) — ${a.title}`,
      body: `${a.title} (${a.subject || a.className || 'assignment'}) is past due with ${ungraded} submission(s) still ungraded. Please grade them.`,
      link: '/portal/teacher?tab=assignments',
      escalate: daysOverdue >= ASSIGNMENT_ESCALATION_DAYS && !!hod,
      escalationTargets: hod ? [{ role: 'hod', id: hod._id, tag: 'hod', link: '/portal/hod?tab=ongoingClasses' }] : [],
      escalationBody: `${a.title} (${a.department || 'a department'}) has had ${ungraded} ungraded submission(s) for ${daysOverdue}+ day(s) past its due date.`,
    });
  }
  return out;
}

// ── Rule 4 — CorrectionRequest pending HOD review too long ─────────────────
async function collectCorrectionRequestCandidates(now, activeDeptIds, adminPool) {
  const triggerAt = new Date(now.getTime() - CORRECTION_TRIGGER_DAYS * DAY_MS);
  const requests = await CorrectionRequest.find({ status: 'pending', createdAt: { $lte: triggerAt } }).lean();
  if (!requests.length) return [];

  const hodCache = new Map();
  const out = [];
  const escalationAt = new Date(now.getTime() - CORRECTION_ESCALATION_DAYS * DAY_MS);

  for (const cr of requests) {
    const deptKey = normalize(cr.department);
    let hod = hodCache.get(deptKey);
    if (hod === undefined) {
      hod = cr.department
        ? await HOD.findOne({ department: new RegExp(`^${escapeRegex(cr.department)}$`, 'i') }).select('_id departmentId').lean()
        : null;
      hodCache.set(deptKey, hod);
    }
    if (!hod) continue; // no HOD to notify — nothing this rule can do
    if (hod.departmentId && !activeDeptIds.has(String(hod.departmentId))) continue;

    const escalate = new Date(cr.createdAt) <= escalationAt;
    // admin-dashboard is a separate app with no notification bell yet (out of
    // Phase 4's five-portal scope) — the link is still recorded for when one
    // exists, or for reading straight off the Notification document meanwhile.
    const escalationTargets = escalate
      ? adminPool.map((a) => ({ role: 'admin', id: a._id, tag: `admin-${a._id}`, link: '/admin/correction-requests' }))
      : [];

    out.push({
      entityType: 'CorrectionRequest', entityId: cr._id,
      recipientRole: 'hod', recipientId: hod._id,
      title: `Correction request pending review — ${cr.subject || cr.studentName || cr.type}`,
      body: `A ${cr.type} correction request (${cr.subject || cr.studentName || ''}) has been pending your review for more than ${CORRECTION_TRIGGER_DAYS} days. Please review it.`,
      link: '/portal/hod?tab=corrections',
      escalate: escalate && escalationTargets.length > 0,
      escalationTargets,
      escalationBody: `A ${cr.type} correction request in ${cr.department || 'a department'} has been pending HOD review for more than ${CORRECTION_ESCALATION_DAYS} days.`,
    });
  }
  return out;
}

// One entry per PART 2 §4.2 rule, as instructed — the runner below is the
// single shared implementation every rule goes through instead of four
// hand-written notify() blocks.
const DOCUMENT_REMINDER_RULES = [
  { type: 'timetableAttendance', collect: (ctx) => collectTimetableAttendanceCandidates(ctx.now, ctx.activeDeptIds) },
  { type: 'resultSheetDraft',    collect: (ctx) => collectResultSheetCandidates(ctx.now, ctx.activeDeptIds, ctx.examStaffPool) },
  { type: 'assignmentUngraded',  collect: (ctx) => collectAssignmentCandidates(ctx.now, ctx.activeDeptIds) },
  { type: 'correctionPending',   collect: (ctx) => collectCorrectionRequestCandidates(ctx.now, ctx.activeDeptIds, ctx.adminPool) },
];

async function runDocumentReminders(ctx, errors) {
  let documentReminders = 0;
  const stamp = dateStamp(ctx.now);

  for (const rule of DOCUMENT_REMINDER_RULES) {
    let candidates = [];
    try {
      candidates = await rule.collect(ctx);
    } catch (err) {
      errors.push(`${rule.type}: ${err.message}`);
      continue;
    }

    for (const c of candidates) {
      try {
        documentReminders += await notifyIfNew({
          recipientRole: c.recipientRole, recipient: c.recipientId, category: 'document',
          title: c.title, body: c.body, link: c.link,
          entityType: c.entityType, entityId: c.entityId, priority: 'normal',
          dedupeKey: `docReminder:${rule.type}:${c.entityId}:${stamp}`,
        });

        if (c.escalate) {
          for (const target of c.escalationTargets) {
            documentReminders += await notifyIfNew({
              recipientRole: target.role, recipient: target.id, category: 'document',
              title: `[Escalated] ${c.title}`, body: c.escalationBody || c.body, link: target.link || c.link,
              entityType: c.entityType, entityId: c.entityId, priority: 'important',
              // A per-recipient suffix — reusing the primary reminder's exact
              // dedupeKey here would make notify() treat this as "already
              // sent" (the primary's document) and silently skip the escalation
              // recipient entirely, since dedupeKey is a global unique index.
              dedupeKey: `docReminder:${rule.type}:${c.entityId}:${stamp}:${target.tag}`,
            });
          }
        }
      } catch (err) {
        errors.push(`${rule.type}:${c.entityId}: ${err.message}`);
      }
    }
  }
  return documentReminders;
}

// ── Absence-threshold + exam-eligibility alerts (Phase 3 §3.2, run from here
// as documented in utils/attendanceAlerts.js) ───────────────────────────────
async function runAbsenceThresholdAndEligibility(ctx, errors) {
  let absenceThresholdAlerts = 0;
  let eligibilityWarnings = 0;
  const stamp = dateStamp(ctx.now);

  const classes = await OngoingClass.find({ status: 'active' }).lean();
  for (const cls of classes) {
    if (cls.departmentId && !ctx.activeDeptIds.has(String(cls.departmentId))) continue;
    try {
      const sessions = await Attendance.find({ ongoingClassId: cls._id, isMakeup: false }).sort({ date: 1 }).lean();
      if (!sessions.length) continue;

      const setting = await settingFor(cls.departmentId, cls.sessionId);
      const consecutive = detectConsecutiveAbsences(sessions, { threshold: setting.consecutiveAbsenceAlertThreshold || 3 });
      const belowThreshold = detectBelowThreshold(sessions, { minPercent: setting.minAttendancePercent || 75 });
      if (!consecutive.length && !belowThreshold.length) continue;

      const regNos = [...new Set([...consecutive, ...belowThreshold].map((r) => r.registrationNo))];
      const students = await Student.find({ registrationNo: { $in: regNos } }).select('_id registrationNo').lean();
      const byReg = new Map(students.map((s) => [s.registrationNo, s]));
      const hod = cls.departmentId ? await HOD.findOne({ departmentId: cls.departmentId }).select('_id').lean() : null;

      for (const row of consecutive) {
        const student = byReg.get(row.registrationNo);
        if (!student) continue;
        const base = `absenceThreshold:${cls._id}:${row.registrationNo}:${stamp}`;
        const items = [{
          recipientRole: 'student', recipient: student._id, category: 'attendance', priority: 'important',
          title: `${row.consecutiveAbsences} consecutive absences — ${cls.subject}`,
          body: `You have been marked absent for ${row.consecutiveAbsences} consecutive sessions in ${cls.subject} (${cls.className}).`,
          link: '/portal/student?tab=dashboard', entityType: 'OngoingClass', entityId: cls._id, dedupeKey: base,
        }];
        if (cls.teacher) items.push({
          recipientRole: 'teacher', recipient: cls.teacher, category: 'attendance', priority: 'important',
          title: `${row.studentName} — ${row.consecutiveAbsences} consecutive absences`,
          body: `${row.studentName} (${row.registrationNo}) has ${row.consecutiveAbsences} consecutive absences in ${cls.subject}.`,
          link: '/portal/teacher?tab=attendance', entityType: 'OngoingClass', entityId: cls._id, dedupeKey: `${base}:teacher`,
        });
        if (hod) items.push({
          recipientRole: 'hod', recipient: hod._id, category: 'attendance', priority: 'normal',
          title: `${row.studentName} — ${row.consecutiveAbsences} consecutive absences`,
          body: `${row.studentName} (${row.registrationNo}) has ${row.consecutiveAbsences} consecutive absences in ${cls.subject} (${cls.department}).`,
          link: '/portal/hod?tab=students', entityType: 'OngoingClass', entityId: cls._id, dedupeKey: `${base}:hod`,
        });
        // notifyMany() is dedupeKey-idempotent (see notifyIfNew() above for
        // why "no error" alone isn't "newly created") — snapshot which keys
        // already exist first, exactly like dispatchAbsenceAlerts() does.
        const keys = items.map((i) => i.dedupeKey);
        const preexisting = new Set((await Notification.find({ dedupeKey: { $in: keys } }).select('dedupeKey')).map((d) => d.dedupeKey));
        const results = await notifyMany(items);
        absenceThresholdAlerts += results.filter((r, i) => r && !r.error && !preexisting.has(items[i].dedupeKey)).length;
      }

      for (const row of belowThreshold) {
        const student = byReg.get(row.registrationNo);
        if (!student) continue;
        const base = `eligibility:${cls._id}:${row.registrationNo}:${stamp}`;
        const items = [{
          recipientRole: 'student', recipient: student._id, category: 'attendance', priority: 'urgent',
          title: `Exam eligibility at risk — ${cls.subject}`,
          body: `Your attendance in ${cls.subject} (${cls.className}) is ${row.attendancePercent}%, below the ${setting.minAttendancePercent || 75}% required for exam eligibility.`,
          link: '/portal/student?tab=dashboard', entityType: 'OngoingClass', entityId: cls._id, dedupeKey: base,
        }];
        if (hod) items.push({
          recipientRole: 'hod', recipient: hod._id, category: 'attendance', priority: 'normal',
          title: `Exam eligibility at risk — ${row.studentName}`,
          body: `${row.studentName} (${row.registrationNo})'s attendance in ${cls.subject} is ${row.attendancePercent}%, below the ${setting.minAttendancePercent || 75}% threshold.`,
          link: '/portal/hod?tab=students', entityType: 'OngoingClass', entityId: cls._id, dedupeKey: `${base}:hod`,
        });
        const keys = items.map((i) => i.dedupeKey);
        const preexisting = new Set((await Notification.find({ dedupeKey: { $in: keys } }).select('dedupeKey')).map((d) => d.dedupeKey));
        const results = await notifyMany(items);
        eligibilityWarnings += results.filter((r, i) => r && !r.error && !preexisting.has(items[i].dedupeKey)).length;
      }
    } catch (err) {
      errors.push(`OngoingClass ${cls._id}: ${err.message}`);
    }
  }

  return { absenceThresholdAlerts, eligibilityWarnings };
}

// Entry point — POST /api/jobs/daily and scripts/runDailyJobs.js both call
// this and nothing else. `now` is injectable so both callers (and tests) can
// pin the clock instead of depending on wall time.
async function runDailyJobs({ now = new Date() } = {}) {
  const errors = [];

  const [activeDeptIds, examStaffPool, adminPool] = await Promise.all([
    loadActiveDepartmentIds(),
    ExaminationStaff.find({ status: 'active' }).select('_id').lean(),
    Admin.find().select('_id').lean(),
  ]);
  const ctx = { now, activeDeptIds, examStaffPool, adminPool };

  let documentReminders = 0;
  try {
    documentReminders = await runDocumentReminders(ctx, errors);
  } catch (err) {
    errors.push(`documentReminders: ${err.message}`);
  }

  let absenceThresholdAlerts = 0;
  let eligibilityWarnings = 0;
  try {
    const r = await runAbsenceThresholdAndEligibility(ctx, errors);
    absenceThresholdAlerts = r.absenceThresholdAlerts;
    eligibilityWarnings = r.eligibilityWarnings;
  } catch (err) {
    errors.push(`absenceThresholdAlerts/eligibilityWarnings: ${err.message}`);
  }

  return { absenceThresholdAlerts, documentReminders, eligibilityWarnings, errors };
}

module.exports = { runDailyJobs };
