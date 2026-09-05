// Phase 6 — every HOD report aggregation lives here, once, so the HOD
// routes (and any future export/admin mirror) share one implementation
// instead of each route hand-rolling its own version of "how many sessions
// were held this month" or "is this student exam-eligible" (hard rule 1).
//
// Every number here is computed from the underlying records (Attendance,
// ResultSheet, TimetableSlot, CorrectionRequest) — never from the legacy
// denormalized Student.attendancePercentage / Student.cgpa fields, which
// routes/studentPortal.js already documents as untrustworthy (admin-editable,
// can drift from reality).
const OngoingClass      = require('../models/OngoingClass');
const TimetableSlot     = require('../models/TimetableSlot');
const Attendance        = require('../models/Attendance');
const ResultSheet       = require('../models/ResultSheet');
const Student           = require('../models/Student');
const CorrectionRequest = require('../models/CorrectionRequest');
const DeptSetting       = require('../models/DeptSetting');
const AcademicSession   = require('../models/AcademicSession');
const DateSheet         = require('../models/DateSheet');
const Semester          = require('../models/Semester');
const DeptNotice        = require('../models/DeptNotice');
const { summarizeSessions, overallPercent } = require('./attendanceSummary');
const { detectBelowThreshold } = require('./attendanceAlerts');
const { gradeForPercentage, round2 } = require('./grading');
const { parseSemesterNumber, DAYS } = require('./timetableGrid');

// How close to the threshold (either side) counts as "borderline" rather
// than a flat eligible/not-eligible cutoff — lets the HOD see who's at risk
// before more sessions are held, not just who has already failed the bar.
const BORDERLINE_MARGIN = 5;

const DAY_JS_INDEX = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function monthBounds(monthStr) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(monthStr || ''));
  if (!m) throw new Error('month must be in YYYY-MM format.');
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) throw new Error('month must be in YYYY-MM format.');
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function previousMonthStr(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// How many times `dayName` (e.g. 'Monday') falls within [from, to] inclusive.
function countWeekdayOccurrences(dayName, from, to) {
  const jsIdx = DAY_JS_INDEX[dayName];
  if (jsIdx == null || from > to) return 0;
  let count = 0;
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const last = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= last) {
    if (cur.getUTCDay() === jsIdx) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function avgOf(rows, field) {
  if (!rows.length) return null;
  return round2(rows.reduce((sum, r) => sum + (Number(r[field]) || 0), 0) / rows.length);
}

// ── 6.2 GET /reports/monthly ────────────────────────────────────────────────
// withDelta=false stops the one level of recursion (this month calls itself
// once for the previous month, to diff against) from ever going further back.
async function buildMonthlyReport({ departmentId, department, month, programId, semesterNumber }, withDelta) {
  const { start, end } = monthBounds(month);
  const now = new Date();
  // Sessions that haven't happened yet this month don't count as "required
  // but unmarked" — clip the required-sessions window to today when the
  // requested month is the current (or a future) one.
  const expectedEnd = start > now ? null : (end < now ? end : now);

  const classFilter = { departmentId, status: 'active' };
  if (programId) classFilter.programId = programId;
  let classes = await OngoingClass.find(classFilter);
  if (semesterNumber) classes = classes.filter((c) => parseSemesterNumber(c.semester) === Number(semesterNumber));
  const classIds = classes.map((c) => c._id);

  const [slots, monthSessions, resultSheets] = await Promise.all([
    classIds.length ? TimetableSlot.find({ ongoingClass: { $in: classIds }, status: 'active' }) : [],
    classIds.length ? Attendance.find({ ongoingClassId: { $in: classIds }, date: { $gte: start, $lte: end } }) : [],
    classIds.length ? ResultSheet.find({ ongoingClassId: { $in: classIds } }).select('ongoingClassId status') : [],
  ]);

  const slotsByClass = new Map();
  slots.forEach((s) => {
    const key = String(s.ongoingClass);
    if (!slotsByClass.has(key)) slotsByClass.set(key, []);
    slotsByClass.get(key).push(s);
  });
  const sessionsByClass = new Map();
  monthSessions.forEach((s) => {
    const key = String(s.ongoingClassId);
    if (!sessionsByClass.has(key)) sessionsByClass.set(key, []);
    sessionsByClass.get(key).push(s);
  });
  const pendingByClass = new Map();
  resultSheets.forEach((r) => {
    if (r.status === 'finalized') return;
    const key = String(r.ongoingClassId || '');
    pendingByClass.set(key, (pendingByClass.get(key) || 0) + 1);
  });

  const settingCache = new Map();
  async function settingForClass(cls) {
    if (!cls.departmentId || !cls.sessionId) return { minAttendancePercent: 75 };
    const key = `${cls.departmentId}:${cls.sessionId}`;
    if (!settingCache.has(key)) settingCache.set(key, await DeptSetting.getOrDefault(cls.departmentId, cls.sessionId));
    return settingCache.get(key);
  }

  const courseRows = [];
  const allDefaulterRegNos = new Set();
  const attendanceAccumulator = [];
  let totalRequired = 0, totalHeld = 0, totalMakeup = 0, totalUnmarked = 0, totalPending = 0;

  for (const cls of classes) { // eslint-disable-line no-restricted-syntax
    const classSlots = slotsByClass.get(String(cls._id)) || [];
    const required = expectedEnd
      ? classSlots.reduce((sum, slot) => sum + countWeekdayOccurrences(slot.day, start, expectedEnd), 0)
      : 0;
    const classSessions = sessionsByClass.get(String(cls._id)) || [];
    const regular = classSessions.filter((s) => !s.isMakeup);
    const makeup = classSessions.filter((s) => s.isMakeup);
    const unmarked = Math.max(0, required - regular.length);

    const summary = summarizeSessions(classSessions);
    const averageAttendance = avgOf(summary, 'attendancePercent');

    const setting = await settingForClass(cls); // eslint-disable-line no-await-in-loop
    const defaulters = detectBelowThreshold(classSessions, { minPercent: setting.minAttendancePercent ?? 75 });
    defaulters.forEach((d) => allDefaulterRegNos.add(d.registrationNo));

    const pendingResultSheets = pendingByClass.get(String(cls._id)) || 0;

    courseRows.push({
      ongoingClassId: cls._id, subject: cls.subject, courseCode: cls.courseCode || '',
      teacherId: cls.teacherId, teacherName: cls.teacherName,
      sessionsRequired: required, sessionsHeld: regular.length, makeupSessions: makeup.length,
      unmarkedSessions: unmarked, averageAttendance, defaultersCount: defaulters.length,
      defaulters: defaulters.map((d) => ({ registrationNo: d.registrationNo, studentName: d.studentName, attendancePercent: d.attendancePercent })),
      pendingResultSheets,
    });

    totalRequired += required; totalHeld += regular.length; totalMakeup += makeup.length;
    totalUnmarked += unmarked; totalPending += pendingResultSheets;
    attendanceAccumulator.push(...summary);
  }

  const deptAverageAttendance = avgOf(attendanceAccumulator, 'attendancePercent');

  const byTeacher = new Map();
  courseRows.forEach((r) => {
    const key = r.teacherId || r.teacherName || 'unknown';
    if (!byTeacher.has(key)) byTeacher.set(key, { teacherId: r.teacherId, teacherName: r.teacherName, required: 0, held: 0 });
    const t = byTeacher.get(key);
    t.required += r.sessionsRequired; t.held += r.sessionsHeld;
  });
  const teacherDelivery = Array.from(byTeacher.values()).map((t) => ({
    ...t, deliveryRate: t.required > 0 ? round2((t.held / t.required) * 100) : null,
  }));

  let monthOverMonthDelta = null;
  if (withDelta) {
    const previousMonth = previousMonthStr(month);
    const prev = await buildMonthlyReport({ departmentId, department, month: previousMonth, programId, semesterNumber }, false);
    monthOverMonthDelta = {
      previousMonth,
      averageAttendanceDelta: (deptAverageAttendance != null && prev.totals.averageAttendance != null)
        ? round2(deptAverageAttendance - prev.totals.averageAttendance) : null,
      sessionsHeldDelta: totalHeld - prev.totals.sessionsHeld,
    };
  }

  return {
    month, department, programId: programId || null, semesterNumber: semesterNumber ? Number(semesterNumber) : null,
    courses: courseRows,
    totals: {
      sessionsRequired: totalRequired, sessionsHeld: totalHeld, makeupSessions: totalMakeup,
      unmarkedSessions: totalUnmarked, pendingResultSheets: totalPending,
      averageAttendance: deptAverageAttendance, defaultersCount: allDefaulterRegNos.size,
    },
    teacherDelivery,
    monthOverMonthDelta,
  };
}

function getMonthlyReport(opts) {
  return buildMonthlyReport(opts, true);
}

// One session's attendance average + pass rate for a given semester number —
// the building block both the main semester report and its 4-semester trend
// reuse, so the trend is never a second, differently-computed number.
async function semesterAttendanceAndPassRate(departmentId, sessionId, semNum) {
  const classes = (await OngoingClass.find({ departmentId, sessionId, status: 'active' }))
    .filter((c) => parseSemesterNumber(c.semester) === semNum);
  const classIds = classes.map((c) => c._id);
  const sessions = classIds.length ? await Attendance.find({ ongoingClassId: { $in: classIds } }).select('records') : [];
  const summary = summarizeSessions(sessions);
  const averageAttendance = avgOf(summary, 'attendancePercent');

  const sheets = (await ResultSheet.find({ departmentId, sessionId, status: 'finalized' }).select('semester entries'))
    .filter((s) => parseSemesterNumber(s.semester) === semNum);
  let pass = 0, total = 0;
  sheets.forEach((s) => (s.entries || []).forEach((e) => { total += 1; if (e.resultStatus === 'Pass') pass += 1; }));
  const passRate = total ? round2((pass / total) * 100) : null;

  return { averageAttendance, passRate };
}

// ── 6.2 GET /reports/semester ───────────────────────────────────────────────
async function getSemesterReport({ departmentId, department, sessionId, semesterNumber }) {
  const semNum = Number(semesterNumber);

  const [enrolledCount, pendingCount, students] = await Promise.all([
    Student.countDocuments({ departmentId, sessionId, currentSemester: semNum, status: 'approved' }),
    Student.countDocuments({ departmentId, sessionId, currentSemester: semNum, status: 'pending' }),
    Student.find({ departmentId, sessionId, currentSemester: semNum, status: 'approved' })
      .select('registrationNo programId timeSession'),
  ]);

  const classes = (await OngoingClass.find({ departmentId, sessionId, status: 'active' }))
    .filter((c) => parseSemesterNumber(c.semester) === semNum);
  const classIds = classes.map((c) => c._id);
  const allSessions = classIds.length ? await Attendance.find({ ongoingClassId: { $in: classIds } }) : [];
  const sessionsByClass = new Map();
  allSessions.forEach((s) => {
    const key = String(s.ongoingClassId);
    if (!sessionsByClass.has(key)) sessionsByClass.set(key, []);
    sessionsByClass.get(key).push(s);
  });

  // Attendance distribution — each student's own overall % across whichever
  // of this semester's classes match their program + time-session.
  const buckets = { '90-100': 0, '75-89': 0, '50-74': 0, '<50': 0 };
  students.forEach((student) => {
    const matching = classes.filter((c) =>
      (!c.programId || !student.programId || String(c.programId) === String(student.programId)) &&
      (!c.timeSession || !student.timeSession || c.timeSession === student.timeSession));
    const sessions = matching.flatMap((c) => sessionsByClass.get(String(c._id)) || []);
    const pct = overallPercent(sessions, student.registrationNo);
    if (pct == null) return;
    if (pct >= 90) buckets['90-100'] += 1;
    else if (pct >= 75) buckets['75-89'] += 1;
    else if (pct >= 50) buckets['50-74'] += 1;
    else buckets['<50'] += 1;
  });

  // Course-wise averages + grade/pass-fail distribution — reuses
  // utils/grading.js's HEC scale, never a second hand-typed grade table.
  const resultSheets = (await ResultSheet.find({ departmentId, sessionId, status: 'finalized' })
    .select('subject ongoingClassId semester entries totalMarks teacherName'))
    .filter((s) => parseSemesterNumber(s.semester) === semNum);

  const gradeDistribution = {};
  let passCount = 0, failCount = 0;
  const courseAverages = [];
  for (const sheet of resultSheets) { // eslint-disable-line no-restricted-syntax
    let sumPct = 0;
    (sheet.entries || []).forEach((e) => {
      const pct = round2((e.obtainedMarks / (sheet.totalMarks || 100)) * 100);
      sumPct += pct;
      const { grade } = gradeForPercentage(pct);
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      if (e.resultStatus === 'Pass') passCount += 1;
      else if (e.resultStatus === 'Fail') failCount += 1;
    });
    const classSessions = sheet.ongoingClassId ? (sessionsByClass.get(String(sheet.ongoingClassId)) || []) : [];
    const classSummary = summarizeSessions(classSessions);
    courseAverages.push({
      subject: sheet.subject, teacherName: sheet.teacherName,
      studentCount: sheet.entries?.length || 0,
      averageMarksPercent: sheet.entries?.length ? round2(sumPct / sheet.entries.length) : null,
      averageAttendance: avgOf(classSummary, 'attendancePercent'),
    });
  }

  // Teacher workload delivered this semester.
  const byTeacher = new Map();
  classes.forEach((c) => {
    const key = c.teacherId || String(c.teacher) || 'unknown';
    if (!byTeacher.has(key)) byTeacher.set(key, { teacherId: c.teacherId, teacherName: c.teacherName, coursesCount: 0, sessionsDelivered: 0 });
    const t = byTeacher.get(key);
    t.coursesCount += 1;
    t.sessionsDelivered += (sessionsByClass.get(String(c._id)) || []).filter((s) => !s.isMakeup).length;
  });

  const [raised, approved, rejected, pending] = await Promise.all([
    CorrectionRequest.countDocuments({ department }),
    CorrectionRequest.countDocuments({ department, status: 'approved' }),
    CorrectionRequest.countDocuments({ department, status: 'rejected' }),
    CorrectionRequest.countDocuments({ department, status: 'pending' }),
  ]);

  // Trend — this same semester number's performance across the last four
  // academic sessions (batches), oldest first, current session included.
  const recentSessions = await AcademicSession.find({}).sort({ startYear: -1, name: -1 }).limit(4);
  const trend = [];
  for (const s of recentSessions.reverse()) { // eslint-disable-line no-restricted-syntax
    const stats = await semesterAttendanceAndPassRate(departmentId, s._id, semNum); // eslint-disable-line no-await-in-loop
    trend.push({ sessionId: s._id, session: s.name, isCurrent: String(s._id) === String(sessionId), ...stats });
  }

  return {
    sessionId, semesterNumber: semNum, department,
    enrolment: { approved: enrolledCount, pending: pendingCount },
    attendanceDistribution: buckets,
    gradeDistribution, passCount, failCount,
    courseAverages,
    teacherWorkload: Array.from(byTeacher.values()),
    correctionRequests: { raised, approved, rejected, pending },
    trend,
  };
}

// ── 6.2 GET /reports/exam-eligibility ───────────────────────────────────────
async function getExamEligibility({ departmentId, department, sessionId, semesterNumber, examType }) {
  const semNum = Number(semesterNumber);
  const deptSetting = await DeptSetting.getOrDefault(departmentId, sessionId);
  const minAttendancePercent = deptSetting.minAttendancePercent ?? 75;

  const students = await Student.find({ departmentId, sessionId, currentSemester: semNum, status: 'approved' })
    .select('registrationNo fullName program programId timeSession');

  const classes = (await OngoingClass.find({ departmentId, sessionId, status: 'active' }))
    .filter((c) => parseSemesterNumber(c.semester) === semNum);
  const classIds = classes.map((c) => c._id);

  const [allSessions, pendingCRs] = await Promise.all([
    classIds.length ? Attendance.find({ ongoingClassId: { $in: classIds } }) : [],
    classIds.length ? CorrectionRequest.find({ type: 'attendance', status: 'pending', ongoingClassId: { $in: classIds } })
      .select('ongoingClassId studentRegistrationNo') : [],
  ]);
  const sessionsByClass = new Map();
  allSessions.forEach((s) => {
    const key = String(s.ongoingClassId);
    if (!sessionsByClass.has(key)) sessionsByClass.set(key, []);
    sessionsByClass.get(key).push(s);
  });
  const summaryByClass = new Map();
  function summaryFor(classId) {
    const key = String(classId);
    if (!summaryByClass.has(key)) {
      const rows = summarizeSessions(sessionsByClass.get(key) || []);
      summaryByClass.set(key, new Map(rows.map((r) => [r.registrationNo, r])));
    }
    return summaryByClass.get(key);
  }
  const pendingByKey = new Set(pendingCRs.map((c) => `${c.ongoingClassId}:${c.studentRegistrationNo}`));

  const rows = [];
  let eligibleCount = 0, borderlineCount = 0, notEligibleCount = 0, pendingFlagCount = 0;

  students.forEach((student) => {
    const matching = classes.filter((c) =>
      (!c.programId || !student.programId || String(c.programId) === String(student.programId)) &&
      (!c.timeSession || !student.timeSession || c.timeSession === student.timeSession));

    matching.forEach((cls) => {
      const rowMap = summaryFor(cls._id);
      const summary = rowMap.get(student.registrationNo);
      const total = summary?.total || 0;
      const attended = summary ? summary.Present + summary.Late : 0;
      const attendancePercent = summary ? summary.attendancePercent : null;

      let status;
      if (total === 0) status = 'no-data';
      else if (attendancePercent >= minAttendancePercent) status = 'eligible';
      else if (attendancePercent >= minAttendancePercent - BORDERLINE_MARGIN) status = 'borderline';
      else status = 'not-eligible';

      // Extra sessions needed — assuming the student attends every one of
      // them — for the running percentage to reach the threshold:
      // (attended + x) / (total + x) >= threshold/100  =>  x >= (t*total - attended) / (1 - t)
      let shortfallSessions = 0;
      if (status !== 'eligible' && status !== 'no-data' && minAttendancePercent < 100) {
        const t = minAttendancePercent / 100;
        shortfallSessions = Math.max(0, Math.ceil((t * total - attended) / (1 - t)));
      }

      const pendingCorrection = pendingByKey.has(`${cls._id}:${student.registrationNo}`);
      if (pendingCorrection) pendingFlagCount += 1;
      if (status === 'eligible') eligibleCount += 1;
      else if (status === 'borderline') borderlineCount += 1;
      else if (status === 'not-eligible') notEligibleCount += 1;

      rows.push({
        registrationNo: student.registrationNo, studentName: student.fullName, program: student.program,
        ongoingClassId: cls._id, subject: cls.subject, courseCode: cls.courseCode || '', teacherName: cls.teacherName,
        attended, total, attendancePercent, status, shortfallSessions, pendingCorrection,
      });
    });
  });

  return {
    department, sessionId, semesterNumber: semNum, examType: examType || null, minAttendancePercent,
    summary: { total: rows.length, eligible: eligibleCount, borderline: borderlineCount, notEligible: notEligibleCount, pendingCorrections: pendingFlagCount },
    rows,
  };
}

// ── 6.1 Notices & Calendar — month view overlaying exams, semester
// start/end, notices, and make-up classes on one calendar. ─────────────────
async function getCalendarEvents({ departmentId, department, month }) {
  const { start, end } = monthBounds(month);
  const inMonth = (d) => d && new Date(d) >= start && new Date(d) <= end;

  const [dateSheets, semesters, notices, makeupSessions] = await Promise.all([
    DateSheet.find({ departmentId, isPublished: true }).select('title examType examSchedule'),
    Semester.find({ departmentId }).select('name startDate endDate'),
    DeptNotice.find({ department, isPublished: true }).select('title priority publishAt createdAt'),
    Attendance.find({ department, isMakeup: true, date: { $gte: start, $lte: end } }).select('subject className date'),
  ]);

  const events = [];
  dateSheets.forEach((ds) => (ds.examSchedule || []).forEach((ex) => {
    if (inMonth(ex.date)) {
      events.push({ type: 'exam', date: ex.date, title: `${ex.subject} — ${ds.examType}`, meta: { room: ex.room, startTime: ex.startTime, endTime: ex.endTime } });
    }
  }));
  semesters.forEach((s) => {
    if (inMonth(s.startDate)) events.push({ type: 'semester-start', date: s.startDate, title: `${s.name} starts` });
    if (inMonth(s.endDate)) events.push({ type: 'semester-end', date: s.endDate, title: `${s.name} ends` });
  });
  notices.forEach((n) => {
    const d = n.publishAt || n.createdAt;
    if (inMonth(d)) events.push({ type: 'notice', date: d, title: n.title, meta: { priority: n.priority } });
  });
  makeupSessions.forEach((s) => events.push({ type: 'makeup-class', date: s.date, title: `${s.subject} (make-up)`, meta: { className: s.className } }));

  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return { month, events };
}

// Shared xlsx sheet writer for every report export — one header row (bold,
// tinted), one row per data record, sized columns from the caller's spec.
function writeReportSheet(sheet, columns, rows) {
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7C6D9' } };
  rows.forEach((r) => sheet.addRow(r));
}

module.exports = {
  getMonthlyReport, getSemesterReport, getExamEligibility, getCalendarEvents,
  writeReportSheet, monthBounds, previousMonthStr, BORDERLINE_MARGIN,
};
