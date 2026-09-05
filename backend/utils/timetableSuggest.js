// Auto-suggest engine — proposes clash-free day/time/room combinations for
// whatever weekly sessions an OngoingClass is still missing (per
// utils/creditHours.js's requiredSessionsFor(), the single source of truth
// for how many sessions a course needs). Nothing here is ever saved; routes/
// hodPortal.js's POST /timetable/suggest returns the proposals for the HOD
// to accept/edit/skip, and POST /timetable(/bulk) does the actual saving.
const OngoingClass = require('../models/OngoingClass');
const Room = require('../models/Room');
const DeptSetting = require('../models/DeptSetting');
const TimetableSlot = require('../models/TimetableSlot');
const { requiredSessionsFor } = require('./creditHours');
const { slotsOverlap, addMinutes, timeToMinutes } = require('./timetableClash');
const { DAYS, parseSemesterNumber, sectionKeyFor } = require('./timetableGrid');

// Builds a plain object shaped like a TimetableSlot document, snapshotting
// department/program/session/course/teacher off the OngoingClass exactly
// like every other new-model write in this app (see validators/commonRefs.js
// snapshotRefs) — the caller (a suggestion, or a manual POST /timetable) only
// ever has to supply the slot-specific bits: kind, day, startTime, duration, room.
function buildCandidateSlot(oc, { kind, day, startTime, durationMinutes, room }) {
  const semesterNumber = parseSemesterNumber(oc.semester);
  return {
    departmentId: oc.departmentId, department: oc.department || '',
    programId: oc.programId, program: oc.program || '',
    sessionId: oc.sessionId, academicSession: oc.academicSession || '',
    semesterNumber,
    timeSession: oc.timeSession,
    sectionKey: sectionKeyFor({ programId: oc.programId, semesterNumber, timeSession: oc.timeSession }),
    courseId: oc.courseId || undefined, courseCode: oc.courseCode || '', subject: oc.subject,
    ongoingClass: oc._id,
    teacher: oc.teacher, teacherName: oc.teacherName || '', teacherId: oc.teacherId || '',
    roomId: room._id, room: room.code ? `${room.code} — ${room.name}` : room.name,
    kind, day, startTime, endTime: addMinutes(startTime, durationMinutes), durationMinutes,
    status: 'active',
  };
}

async function suggestSlots({ ongoingClassId }) {
  const oc = await OngoingClass.findById(ongoingClassId);
  if (!oc) throw new Error('OngoingClass not found.');
  if (!oc.departmentId || !oc.programId || !oc.sessionId || !oc.timeSession) {
    throw new Error('This class needs a department, program, academic session and time session set before slots can be suggested.');
  }

  const required = await requiredSessionsFor({ creditHours: oc.creditHours, isLab: oc.isLab, departmentId: oc.departmentId });
  const existing = await TimetableSlot.find({ ongoingClass: oc._id, status: 'active' }).sort({ day: 1, startTime: 1 });

  if (!required.length) {
    return {
      required, existing, suggestions: [],
      unplaceable: [{ reason: "No credit-hour policy is configured for this course's credit hours yet — set one up under Credit-Hour Policies first." }],
    };
  }

  // Diff required vs already-scheduled, per session kind, so re-running only
  // proposes what's still missing.
  const requiredByKind = {};
  const durationByKind = {};
  required.forEach((r) => { requiredByKind[r.kind] = (requiredByKind[r.kind] || 0) + 1; durationByKind[r.kind] = r.durationMinutes; });
  const existingByKind = {};
  existing.forEach((s) => { existingByKind[s.kind] = (existingByKind[s.kind] || 0) + 1; });

  const missing = [];
  for (const kind of Object.keys(requiredByKind)) {
    const need = requiredByKind[kind] - (existingByKind[kind] || 0);
    for (let i = 0; i < need; i++) missing.push({ kind, durationMinutes: durationByKind[kind] });
  }
  if (!missing.length) return { required, existing, suggestions: [], unplaceable: [] };

  const deptSetting = await DeptSetting.getOrDefault(oc.departmentId, oc.sessionId);
  const window = oc.timeSession === 'Evening' ? deptSetting.eveningWindow : deptSetting.morningWindow;
  const windowStart = window?.start || '08:00';
  const windowEnd = window?.end || '17:00';
  const granularity = deptSetting.slotGranularityMinutes || 30;
  const configuredDays = (deptSetting.workingDays || []).filter((d) => DAYS.includes(d));
  const days = configuredDays.length ? configuredDays : DAYS;

  const semesterNumber = parseSemesterNumber(oc.semester);
  const sectionKey = sectionKeyFor({ programId: oc.programId, semesterNumber, timeSession: oc.timeSession });

  const rooms = await Room.find({
    isActive: true, deletedAt: null,
    $or: [{ departmentId: oc.departmentId }, { departmentId: null }],
  });
  if (!rooms.length) {
    return { required, existing, suggestions: [], unplaceable: missing.map((m) => ({ ...m, reason: 'No active rooms are available for this department.' })) };
  }

  // One bulk fetch each for teacher/room/section conflicts instead of a DB
  // round trip per day/time/room combination tried below.
  const roomIds = rooms.map((r) => r._id);
  const [teacherSlots, roomSlots, sectionSlots, sectionRoomIds] = await Promise.all([
    TimetableSlot.find({ sessionId: oc.sessionId, status: 'active', teacher: oc.teacher }).select('day startTime endTime'),
    TimetableSlot.find({ sessionId: oc.sessionId, status: 'active', roomId: { $in: roomIds } }).select('day startTime endTime roomId'),
    TimetableSlot.find({ sessionId: oc.sessionId, status: 'active', sectionKey }).select('day startTime endTime'),
    TimetableSlot.distinct('roomId', { sessionId: oc.sessionId, status: 'active', sectionKey }),
  ]);
  // Prefer a room already used by this section, so students don't scatter
  // across the building for different sessions of the same class.
  const sectionRoomIdSet = new Set(sectionRoomIds.map(String));
  const orderedRooms = [...rooms].sort((a, b) => {
    const aUsed = sectionRoomIdSet.has(String(a._id));
    const bUsed = sectionRoomIdSet.has(String(b._id));
    if (aUsed === bUsed) return 0;
    return aUsed ? -1 : 1;
  });

  const usedDays = new Set(existing.map((s) => s.day));
  const placed = [];
  const unplaceable = [];

  for (const need of missing) {
    // Prefer a day this course hasn't already used this week; only fall back
    // to reusing a day if nothing else fits.
    const dayOrder = [...days].sort((a, b) => {
      const aUsed = usedDays.has(a);
      const bUsed = usedDays.has(b);
      if (aUsed === bUsed) return 0;
      return aUsed ? 1 : -1;
    });

    let found = null;
    for (const day of dayOrder) {
      if (found) break;
      const dayTeacherSlots = teacherSlots.filter((s) => s.day === day);
      const daySectionSlots = sectionSlots.filter((s) => s.day === day);
      const dayPlaced = placed.filter((s) => s.day === day);

      for (let t = timeToMinutes(windowStart); t + need.durationMinutes <= timeToMinutes(windowEnd); t += granularity) {
        if (found) break;
        const startTime = addMinutes('00:00', t);
        const candidateBase = { day, startTime, endTime: addMinutes(startTime, need.durationMinutes) };

        // Teacher/section busy at this day+time regardless of room — same
        // teacher and same section apply to every room, so check once.
        const busy = dayTeacherSlots.some((s) => slotsOverlap(candidateBase, s))
          || daySectionSlots.some((s) => slotsOverlap(candidateBase, s))
          || dayPlaced.some((s) => slotsOverlap(candidateBase, s));
        if (busy) continue;

        for (const room of orderedRooms) {
          const roomBusy = roomSlots.some((s) => s.day === day && String(s.roomId) === String(room._id) && slotsOverlap(candidateBase, s));
          if (roomBusy) continue;
          found = buildCandidateSlot(oc, { kind: need.kind, day, startTime, durationMinutes: need.durationMinutes, room });
          break;
        }
      }
    }

    if (found) {
      placed.push(found);
      usedDays.add(found.day);
    } else {
      unplaceable.push({ kind: need.kind, durationMinutes: need.durationMinutes, reason: "No clash-free day/time/room combination was found within the department's working window." });
    }
  }

  return { required, existing, suggestions: placed, unplaceable };
}

module.exports = { suggestSlots, buildCandidateSlot };
