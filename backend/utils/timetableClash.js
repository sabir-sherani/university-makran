// Single source of truth for "does this timetable slot collide with another
// one" — both the manual create/edit routes (routes/hodPortal.js) and the
// auto-suggest engine (utils/timetableSuggest.js) call this instead of
// re-deriving the overlap math themselves.
const TimetableSlot = require('../models/TimetableSlot');

function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

function addMinutes(hhmm, minutes) {
  const total = (timeToMinutes(hhmm) + Number(minutes)) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Inclusive-exclusive: a slot ending at 10:30 and another starting at 10:30
// do NOT overlap. This is the single most likely place for a boundary bug in
// this feature — see backend/scripts/testTimetableClash.js for assertions.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function slotsOverlap(a, b) {
  if (a.day !== b.day) return false;
  return rangesOverlap(
    timeToMinutes(a.startTime), timeToMinutes(a.endTime),
    timeToMinutes(b.startTime), timeToMinutes(b.endTime),
  );
}

// Hard clashes for `candidate` (a plain object shaped like a TimetableSlot —
// needs at minimum sessionId, day, startTime, endTime, teacher, roomId,
// sectionKey) against active DB slots in the same academic session. Returns
// an array of human-readable conflict strings; empty means safe to save.
// excludeSlotId lets an update check everything except the slot being edited.
async function findClashes(candidate, { excludeSlotId } = {}) {
  const base = { sessionId: candidate.sessionId, status: 'active', day: candidate.day };
  if (excludeSlotId) base._id = { $ne: excludeSlotId };

  const [teacherRows, roomRows, sectionRows] = await Promise.all([
    TimetableSlot.find({ ...base, teacher: candidate.teacher }),
    TimetableSlot.find({ ...base, roomId: candidate.roomId }),
    TimetableSlot.find({ ...base, sectionKey: candidate.sectionKey }),
  ]);

  const conflicts = [];
  for (const row of teacherRows) {
    if (slotsOverlap(candidate, row)) {
      conflicts.push(`Teacher clash: ${row.teacherName || 'this teacher'} already has ${row.subject || row.courseCode || 'a class'} on ${row.day} ${row.startTime}–${row.endTime}.`);
    }
  }
  for (const row of roomRows) {
    if (slotsOverlap(candidate, row)) {
      conflicts.push(`Room clash: ${row.room || 'this room'} is already booked for ${row.subject || row.courseCode || 'a class'} on ${row.day} ${row.startTime}–${row.endTime}.`);
    }
  }
  for (const row of sectionRows) {
    if (slotsOverlap(candidate, row)) {
      conflicts.push(`Section clash: this class already has ${row.subject || row.courseCode || 'a session'} on ${row.day} ${row.startTime}–${row.endTime}.`);
    }
  }
  return conflicts;
}

// Checks a batch of not-yet-saved candidates against each other (in-memory —
// no DB round trip) using the same three rules. Used by POST /timetable/bulk
// so two mutually-clashing rows in the same request are caught even before
// either one exists in the database. Returns { index, message }[] — index is
// the position in `candidates` of the row that clashes with an earlier one.
function findBatchClashes(candidates) {
  const conflicts = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.sessionId?.toString() !== b.sessionId?.toString()) continue;
      if (!slotsOverlap(a, b)) continue;
      if (String(a.teacher) === String(b.teacher)) {
        conflicts.push({ index: i, message: `Row ${i + 1} clashes with row ${j + 1}: same teacher, overlapping time on ${a.day}.` });
      }
      if (String(a.roomId) === String(b.roomId)) {
        conflicts.push({ index: i, message: `Row ${i + 1} clashes with row ${j + 1}: same room, overlapping time on ${a.day}.` });
      }
      if (a.sectionKey === b.sectionKey) {
        conflicts.push({ index: i, message: `Row ${i + 1} clashes with row ${j + 1}: same class section, overlapping time on ${a.day}.` });
      }
    }
  }
  return conflicts;
}

// Soft, non-blocking warnings — returned separately from findClashes so the
// caller can still save the slot while surfacing them. Every input besides
// `candidate` is optional; a missing one just skips that check.
async function findWarnings(candidate, { deptSetting, room, sectionStudentCount } = {}) {
  const warnings = [];

  if (deptSetting) {
    const window = candidate.timeSession === 'Evening' ? deptSetting.eveningWindow : deptSetting.morningWindow;
    if (window?.start && window?.end) {
      if (timeToMinutes(candidate.startTime) < timeToMinutes(window.start) || timeToMinutes(candidate.endTime) > timeToMinutes(window.end)) {
        warnings.push(`This slot falls outside the department's ${(candidate.timeSession || '').toLowerCase()} window (${window.start}–${window.end}).`);
      }
    }
    if (deptSetting.workingDays?.length && !deptSetting.workingDays.includes(candidate.day)) {
      warnings.push(`${candidate.day} is not one of the department's configured working days.`);
    }
  }

  if (room && sectionStudentCount != null && room.capacity < sectionStudentCount) {
    warnings.push(`${room.name || room.code} seats ${room.capacity}, but this section has ${sectionStudentCount} student(s).`);
  }

  const teacherDaySlots = await TimetableSlot.find({
    teacher: candidate.teacher, day: candidate.day, status: 'active', sessionId: candidate.sessionId,
  }).select('startTime endTime');
  const ranges = teacherDaySlots
    .map((s) => ({ start: timeToMinutes(s.startTime), end: timeToMinutes(s.endTime) }))
    .concat([{ start: timeToMinutes(candidate.startTime), end: timeToMinutes(candidate.endTime) }])
    .sort((a, b) => a.start - b.start);
  let run = 1, maxRun = 1;
  for (let i = 1; i < ranges.length; i++) {
    run = ranges[i].start === ranges[i - 1].end ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun > 3) {
    warnings.push(`This teacher would have ${maxRun} back-to-back sessions on ${candidate.day}.`);
  }

  return warnings;
}

module.exports = {
  timeToMinutes, addMinutes, rangesOverlap, slotsOverlap,
  findClashes, findBatchClashes, findWarnings,
};
