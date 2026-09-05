# Migration Guide — feat/timetable-attendance-hod

Scripts to run once against an **existing** database when deploying this branch
(timetable, credit-hour policies, make-up attendance, attendance corrections, the
full HOD portal, and departmental reports). A brand-new/empty database needs none
of these — the app creates documents on demand as HODs and admins use the new
features.

All scripts live in `backend/scripts/`, read `MONGO_URI` from `backend/.env`
exactly like the server does, and are safe to re-run (idempotent) unless noted
otherwise. Run them from the `backend/` directory:

```bash
cd backend
node scripts/<script>.js
```

## Order

### 1. `seedCreditHourPolicies.js`
Seeds the university-wide (`departmentId: null`) default `CreditHourPolicy`
documents — the client's stated rules (3CR/no-lab → 2×90min theory; 4CR/lab →
2×90min theory + 1×60min lab) plus the 1CR/2CR/4CR-no-lab defaults. Upserts by
`{departmentId: null, creditHours, isLab}`, so re-running just confirms the
defaults are in place. Run this first — the timetable auto-suggest engine and
`GET /api/portal/hod/timetable/requirements` need at least the university-wide
defaults to compute anything, and individual HODs can layer department-specific
overrides on top afterward via `PATCH /api/portal/hod/credit-hour-policies`.

No flags. Nothing to inspect beforehand.

### 2. `migrateSemesterCoursesToCourses.js`
Reads every existing `SemesterCourse` document (the admin dashboard's per-program
course lists) and upserts the equivalent canonical `Course` record for each course
item, so HOD subject-assignment, the timetable and the transcript can link to a
real `Course` ObjectId instead of retyping a subject title. Matches existing
`Course` docs by `{programId, code}` and updates them in place — does **not**
touch or delete `SemesterCourse`, which stays the source of truth for the admin
Courses page and public department pages.

Preview first, then apply:
```bash
node scripts/migrateSemesterCoursesToCourses.js --dry-run   # prints the plan, writes nothing
node scripts/migrateSemesterCoursesToCourses.js             # applies it
```
The dry run prints one line per course row it would create/update; check that the
credit hours and lab flag it derived from each `theoryLab` string ("3+0", "2+1",
etc.) look right before applying. Rows with a blank title or a `SemesterCourse`
whose `program` ref no longer resolves are skipped and reported by count.

### 3. `fixAttendanceIndex.js`
Migrates the `attendances` collection's unique index from the old 2-field
`{ongoingClassId, date}` to the new 3-field `{ongoingClassId, date, isMakeup}` —
required for make-up classes, which deliberately share a date with the regular
session they're replacing. **This one matters even if you don't run anything
else**: Mongoose does not drop an existing index just because the schema changed,
so until this runs, the first make-up-class attendance a teacher marks on the
same day as a regular session will fail with a duplicate-key error against the
old index.

Also backfills `isMakeup: false` onto every existing `Attendance` document that
predates the field (Mongoose defaults only apply on save, not retroactively), so
the new index has an explicit value to key on for old rows too.

No flags — safe to run any time relative to the code deploy, and safe to re-run
(it detects whether the old index is already gone / new index already exists and
does nothing further in that case).

## Not part of this migration

- `backfillRefs.js` and `flagInvalidRecords.js` (pre-existing, general-purpose
  data-hygiene scripts) are unrelated to this branch — nothing here requires
  re-running them.
- `runDailyJobs.js` is not a migration; it's a manual/local way to trigger the
  same absence-alert / document-reminder / exam-eligibility job that
  `POST /api/jobs/daily` runs in production. See
  [DEPLOYMENT.md §8](./DEPLOYMENT.md#8-scheduled-jobs) for wiring up the actual
  scheduled job.
- `testTimetableClash.js` is a self-cleaning correctness check for the clash-
  detection math, not a migration — safe to run against a real database (it
  deletes everything it creates in a `finally` block) but has no lasting effect
  either way.
