// Builds a student's GPA/CGPA/transcript data entirely server-side from
// finalized ResultSheets, so the student portal only ever renders numbers
// it was given — see utils/grading.js for the grade scale and weighting
// formula this relies on.
const ResultSheet = require('../models/ResultSheet');
const SemesterCourse = require('../models/SemesterCourse');
const { gradeForPercentage, creditWeightedGPA, round2, DEFAULT_CREDIT_HOURS } = require('./grading');

function normalizeTitle(title) {
  return String(title || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// "Semester 3" / "3" / "Sem-3" -> 3. Returns null if no digit is found.
function parseSemesterNumber(semesterLabel) {
  const match = String(semesterLabel || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

// Fetches every SemesterCourse row for a program (all semesters at once,
// since a transcript spans the student's whole enrollment) and builds a
// `${semesterNumber}::${normalizedCourseTitle} -> creditHours` lookup.
async function buildCreditHoursMap(programId) {
  const map = new Map();
  if (!programId) return map;
  const rows = await SemesterCourse.find({ program: programId });
  rows.forEach((row) => {
    (row.courses || []).forEach((c) => {
      if (!c.courseTitle) return;
      map.set(`${row.semesterNumber}::${normalizeTitle(c.courseTitle)}`, Number(c.creditHours) || DEFAULT_CREDIT_HOURS);
    });
  });
  return map;
}

// Returns:
// {
//   entries: [{ ...sheet fields, entry, percentage, grade, gradePoints, creditHours, creditHoursIsDefault }],
//   bySemester: [{ semester, semesterNumber, gpa, creditHours, entries: [...] }],  sorted by semesterNumber (unknowns last)
//   cgpa, totalCreditHours,
//   currentSemesterGPA,  // GPA for student.currentSemester, or null if nothing finalized yet for it
// }
async function buildAcademicSummary(student) {
  const sheets = await ResultSheet.find({
    status: 'finalized',
    'entries.registrationNo': student.registrationNo,
  }).sort({ academicSession: -1, createdAt: -1 });

  const creditMap = await buildCreditHoursMap(student.programId);

  const entries = sheets
    .map((sheet) => {
      const myEntry = sheet.entries.find((e) => e.registrationNo === student.registrationNo);
      if (!myEntry) return null;

      const totalMarks = sheet.totalMarks || 100;
      const percentage = round2((myEntry.obtainedMarks / totalMarks) * 100);
      const { grade, gradePoints } = gradeForPercentage(percentage);

      const semesterNumber = parseSemesterNumber(sheet.semester);
      const creditKey = semesterNumber != null ? `${semesterNumber}::${normalizeTitle(sheet.subject)}` : null;
      const creditHours = (creditKey && creditMap.get(creditKey)) || DEFAULT_CREDIT_HOURS;
      const creditHoursIsDefault = !(creditKey && creditMap.has(creditKey));

      return {
        _id: sheet._id,
        subject: sheet.subject,
        department: sheet.department,
        program: sheet.program,
        semester: sheet.semester,
        semesterNumber,
        academicSession: sheet.academicSession,
        examType: sheet.examType,
        totalMarks,
        passingMarks: sheet.passingMarks,
        teacherName: sheet.teacherName,
        teacherId: sheet.teacherId,
        submittedAt: sheet.submittedAt,
        finalizedAt: sheet.finalizedAt,
        createdAt: sheet.createdAt,
        entry: {
          obtainedMarks: myEntry.obtainedMarks,
          remarks: myEntry.remarks,
          resultStatus: myEntry.resultStatus,
        },
        percentage,
        grade,
        gradePoints,
        creditHours,
        creditHoursIsDefault,
      };
    })
    .filter(Boolean);

  // Group into semesters, keyed by the raw semester label (entries that
  // share a label — the normal case — end up in the same bucket even if
  // parseSemesterNumber couldn't extract a number for sorting).
  const groups = new Map();
  entries.forEach((e) => {
    const key = e.semester || 'Unspecified';
    if (!groups.has(key)) groups.set(key, { semester: key, semesterNumber: e.semesterNumber, entries: [] });
    groups.get(key).entries.push(e);
  });

  const bySemester = Array.from(groups.values())
    .map((g) => ({
      ...g,
      gpa: creditWeightedGPA(g.entries.map((e) => ({ gradePoints: e.gradePoints, creditHours: e.creditHours }))),
      creditHours: g.entries.reduce((sum, e) => sum + e.creditHours, 0),
      passCount: g.entries.filter((e) => e.entry.resultStatus === 'Pass').length,
      failCount: g.entries.filter((e) => e.entry.resultStatus === 'Fail').length,
    }))
    .sort((a, b) => {
      if (a.semesterNumber == null) return 1;
      if (b.semesterNumber == null) return -1;
      return a.semesterNumber - b.semesterNumber;
    });

  const cgpa = creditWeightedGPA(entries.map((e) => ({ gradePoints: e.gradePoints, creditHours: e.creditHours })));
  const totalCreditHours = entries.reduce((sum, e) => sum + e.creditHours, 0);

  const currentSemesterGroup = bySemester.find((g) => g.semesterNumber === student.currentSemester);
  const currentSemesterGPA = currentSemesterGroup ? currentSemesterGroup.gpa : null;

  return { entries, bySemester, cgpa, totalCreditHours, currentSemesterGPA };
}

module.exports = { buildAcademicSummary, parseSemesterNumber, normalizeTitle };
