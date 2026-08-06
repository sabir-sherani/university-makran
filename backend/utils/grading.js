// Server-side grading scale for the Result Cards / Transcript / GPA-CGPA
// features. Every grade, grade-point, and GPA/CGPA value shown to a student
// is computed HERE from raw marks — clients never compute or trust a
// client-supplied grade.
//
// Scale: HEC-aligned 4.0 GPA scale (the stepped +/- table used by most
// Pakistani HEC-recognized universities), applied to the percentage
// obtained = (obtainedMarks / totalMarks) * 100:
//
//   Percentage   Grade   Grade Points
//   90 - 100     A+      4.00
//   85 -  89     A       3.66
//   80 -  84     A-      3.33
//   75 -  79     B+      3.00
//   70 -  74     B       2.66
//   65 -  69     B-      2.33
//   60 -  64     C+      2.00
//   55 -  59     C       1.66
//   50 -  54     C-      1.33
//   45 -  49     D+      1.00
//   40 -  44     D       0.66
//    0 -  39     F       0.00
//
// GPA (per result sheet / per semester) and CGPA (cumulative) are both
// credit-hour weighted: sum(gradePoints * creditHours) / sum(creditHours).
const GRADE_SCALE = [
  { min: 90, grade: 'A+', points: 4.00 },
  { min: 85, grade: 'A',  points: 3.66 },
  { min: 80, grade: 'A-', points: 3.33 },
  { min: 75, grade: 'B+', points: 3.00 },
  { min: 70, grade: 'B',  points: 2.66 },
  { min: 65, grade: 'B-', points: 2.33 },
  { min: 60, grade: 'C+', points: 2.00 },
  { min: 55, grade: 'C',  points: 1.66 },
  { min: 50, grade: 'C-', points: 1.33 },
  { min: 45, grade: 'D+', points: 1.00 },
  { min: 40, grade: 'D',  points: 0.66 },
  { min: 0,  grade: 'F',  points: 0.00 },
];

// Fallback credit hours used when a ResultSheet's subject can't be matched
// to a SemesterCourse entry (e.g. legacy sheets, renamed subjects) — 3 is
// the most common course weight in the seeded curricula.
const DEFAULT_CREDIT_HOURS = 3;

function gradeForPercentage(percentage) {
  const pct = Math.min(100, Math.max(0, Number(percentage) || 0));
  const row = GRADE_SCALE.find((r) => pct >= r.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: row.grade, gradePoints: row.points };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// items: [{ gradePoints, creditHours }] — returns null (not NaN) when there
// are no credit hours to weight against, so callers can render "—" instead
// of a misleading 0.00.
function creditWeightedGPA(items) {
  const totalCredits = items.reduce((sum, it) => sum + (Number(it.creditHours) || 0), 0);
  if (totalCredits <= 0) return null;
  const weighted = items.reduce((sum, it) => sum + (Number(it.gradePoints) || 0) * (Number(it.creditHours) || 0), 0);
  return round2(weighted / totalCredits);
}

module.exports = { GRADE_SCALE, DEFAULT_CREDIT_HOURS, gradeForPercentage, creditWeightedGPA, round2 };
