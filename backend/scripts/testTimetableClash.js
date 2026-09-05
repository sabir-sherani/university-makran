// Boundary-condition assertions for utils/timetableClash.js. Overlap math is
// the single most likely defect in the timetable feature (an off-by-one here
// silently double-books a room or teacher), so this exercises both the pure
// range math AND real findClashes() DB queries — not just the pure function —
// end to end against the real TimetableSlot collection, using synthetic
// ObjectIds that don't correspond to any real department/teacher/room, so
// this is safe to run against a real (dev) database. All documents created
// here are deleted again in a `finally` block regardless of pass/fail.
//
// Usage: node scripts/testTimetableClash.js
const mongoose = require('mongoose');
require('dotenv').config();

const TimetableSlot = require('../models/TimetableSlot');
const { rangesOverlap, slotsOverlap, findClashes, addMinutes } = require('../utils/timetableClash');

let failures = 0;
function assert(label, condition) {
  if (condition) {
    console.log(`  ok   — ${label}`);
  } else {
    failures++;
    console.error(`  FAIL — ${label}`);
  }
}

function testPureRangeMath() {
  console.log('\n1. Pure range-overlap math (no DB):');
  // The exact boundary case called out in the phase brief: an end at 10:30
  // and a start at 10:30 must NOT be treated as a collision.
  assert('10:30 end vs 10:30 start does NOT overlap', rangesOverlap(540, 630, 630, 720) === false);
  assert('reverse order: 10:30 start vs 10:30 end does NOT overlap', rangesOverlap(630, 720, 540, 630) === false);
  assert('one minute of true overlap DOES overlap', rangesOverlap(540, 630, 629, 720) === true);
  assert('fully contained range overlaps', rangesOverlap(540, 720, 600, 660) === true);
  assert('identical ranges overlap', rangesOverlap(540, 630, 540, 630) === true);
  assert('completely separate ranges do not overlap', rangesOverlap(540, 630, 700, 800) === false);

  assert('addMinutes rolls HH:mm forward correctly', addMinutes('09:00', 90) === '10:30');
  assert('slotsOverlap returns false for different days at the same time', slotsOverlap(
    { day: 'Monday', startTime: '09:00', endTime: '10:30' },
    { day: 'Tuesday', startTime: '09:00', endTime: '10:30' },
  ) === false);
}

async function testFindClashesAgainstDb() {
  console.log('\n2. findClashes() against real TimetableSlot documents:');

  const sessionId = new mongoose.Types.ObjectId();
  const departmentId = new mongoose.Types.ObjectId();
  const programId = new mongoose.Types.ObjectId();
  const teacherA = new mongoose.Types.ObjectId();
  const teacherB = new mongoose.Types.ObjectId();
  const roomA = new mongoose.Types.ObjectId();
  const roomB = new mongoose.Types.ObjectId();
  const ongoingClass = new mongoose.Types.ObjectId();
  const sectionKey = `${programId}:3:Morning`;
  const otherSectionKey = `${programId}:5:Morning`;

  const base = {
    departmentId, department: '__TEST__', programId, program: '__TEST__',
    sessionId, academicSession: '__TEST__', semesterNumber: 3, timeSession: 'Morning',
    sectionKey, courseCode: '__TEST__', subject: '__TEST__ Course',
    ongoingClass, teacher: teacherA, teacherName: '__TEST__ Teacher', teacherId: 'TCH-TEST',
    roomId: roomA, room: '__TEST__ Room A', kind: 'theory', status: 'active',
    createdByRole: 'hod',
  };

  const seeded = await TimetableSlot.create([
    { ...base, day: 'Monday', startTime: '09:00', endTime: '10:30', durationMinutes: 90 },
  ]);

  try {
    // Boundary case: a new slot starting exactly when the seeded one ends —
    // must be clash-free.
    const boundaryCandidate = { ...base, day: 'Monday', startTime: '10:30', endTime: '12:00' };
    const boundaryConflicts = await findClashes(boundaryCandidate);
    assert('slot starting exactly at another\'s end time has zero conflicts', boundaryConflicts.length === 0);

    // Genuine 1-minute overlap on the same teacher — must be blocked.
    const teacherClashCandidate = { ...base, day: 'Monday', startTime: '10:00', endTime: '11:30' };
    const teacherConflicts = await findClashes(teacherClashCandidate);
    assert('overlapping same-teacher slot is reported as a conflict', teacherConflicts.some((m) => m.startsWith('Teacher clash')));

    // Same room, different teacher, overlapping — room clash only.
    const roomClashCandidate = { ...base, teacher: teacherB, teacherName: 'Other Teacher', day: 'Monday', startTime: '10:00', endTime: '11:30' };
    const roomConflicts = await findClashes(roomClashCandidate);
    assert('overlapping same-room slot (different teacher) is reported as a room conflict', roomConflicts.some((m) => m.startsWith('Room clash')));
    assert('overlapping same-room slot (different teacher) is NOT reported as a teacher conflict', !roomConflicts.some((m) => m.startsWith('Teacher clash')));

    // Same section, different teacher AND room, overlapping — section clash only.
    const sectionClashCandidate = { ...base, teacher: teacherB, teacherName: 'Other Teacher', roomId: roomB, room: 'Room B', day: 'Monday', startTime: '10:00', endTime: '11:30' };
    const sectionConflicts = await findClashes(sectionClashCandidate);
    assert('overlapping same-section slot (different teacher/room) is reported as a section conflict', sectionConflicts.some((m) => m.startsWith('Section clash')));

    // Different section, different teacher, different room, overlapping time — no clash at all.
    const cleanCandidate = { ...base, teacher: teacherB, teacherName: 'Other Teacher', roomId: roomB, room: 'Room B', sectionKey: otherSectionKey, day: 'Monday', startTime: '10:00', endTime: '11:30' };
    const cleanConflicts = await findClashes(cleanCandidate);
    assert('fully independent slot (different teacher, room, section) has zero conflicts', cleanConflicts.length === 0);

    // Different day, same everything else, same time — no clash.
    const differentDayCandidate = { ...base, day: 'Tuesday', startTime: '09:00', endTime: '10:30' };
    const differentDayConflicts = await findClashes(differentDayCandidate);
    assert('identical time on a different day has zero conflicts', differentDayConflicts.length === 0);

    // excludeSlotId lets an update check against everything except itself.
    const selfConflicts = await findClashes({ ...base, day: 'Monday', startTime: '09:00', endTime: '10:30' }, { excludeSlotId: seeded[0]._id });
    assert('excludeSlotId excludes the slot being edited from its own conflict check', selfConflicts.length === 0);
  } finally {
    await TimetableSlot.deleteMany({ courseCode: '__TEST__' });
  }
}

async function main() {
  testPureRangeMath();

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran';
  await mongoose.connect(uri);
  console.log(`\nConnected to MongoDB (${uri.replace(/\/\/.*@/, '//<redacted>@')})`);
  try {
    await testFindClashesAgainstDb();
  } finally {
    await mongoose.disconnect();
  }

  console.log(failures === 0 ? '\nAll assertions passed.' : `\n${failures} assertion(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
