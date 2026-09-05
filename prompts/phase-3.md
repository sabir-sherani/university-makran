<!-- Self-contained instruction file for the Claude Code agent.
     Paste into the agent:  Read prompts/phase-3.md and do exactly what it says.  -->

# PHASE 3 — Attendance: make-up classes and absence alerts

You are being given ONE phase of a larger project. Do **only this phase**. Do not start the next one.

Work on the branch `feat/timetable-attendance-hod` (create it if it does not exist).

When you finish, run the Acceptance Checklist at the bottom of PART 2 and show me the result of every item. If an item fails, fix it before telling me you are done.

---

# PART 1 — CONTEXT (read this before doing anything)

You are working on an existing, working MERN university management system. **Most of the plumbing already exists and works well. Your job is to extend it, not to rebuild it.**

## Repository layout

```
university-website/
├── backend/                 Express + Mongoose (MongoDB), mounted in app.js
│   ├── models/              45+ Mongoose models
│   ├── routes/              adminPortal.js, hodPortal.js, teacherPortal.js,
│   │                        studentPortal.js, examPortal.js, financePortal.js,
│   │                        lookups.js, courses.js, stats.js …
│   ├── middleware/          auth.js, rateLimiters.js, accountLockout.js
│   ├── validators/          enums.js, fields.js, commonRefs.js, resolveRef.js,
│   │                        refFilters.js, validate.js, index.js
│   ├── utils/               audit.js, mailer.js, cloudinary.js, grading.js,
│   │                        academicSummary.js, sendError.js, nextSequence.js
│   └── app.js / server.js
├── frontend/                Next.js 14 (pages router) + Tailwind — public site + portals
│   └── pages/portal/        hod.js, teacher.js, student.js, exam.js, finance.js
└── admin-dashboard/         Next.js 14 — separate admin app
```

## MANDATORY FIRST STEP

Before writing a single line, read these files in full and confirm back to me in 5 bullet points what you found:

- `backend/app.js`
- `backend/routes/hodPortal.js`
- `backend/routes/teacherPortal.js` (lines 190–330, the Attendance block)
- `backend/models/OngoingClass.js`, `Attendance.js`, `CorrectionRequest.js`, `SemesterCourse.js`
- `backend/validators/commonRefs.js` and `backend/validators/resolveRef.js`
- `backend/utils/audit.js`, `backend/utils/mailer.js`, `backend/utils/cloudinary.js`
- `frontend/pages/portal/hod.js` (sidebar + section-render pattern)

If anything in this prompt contradicts what is actually in the code, **the code wins** — tell me about the contradiction instead of silently guessing.

## WHAT ALREADY EXISTS AND WORKS — DO NOT REBUILD IT

Reuse these. Rewriting any of them is a defect, not an improvement.

| Capability | Where it lives | Status |
|---|---|---|
| Per-role JWT auth, `tokenVersion` invalidation, fresh-from-DB role fields | `middleware/auth.js` (`verifyHODToken`, `verifyTeacherToken`, `verifyStudentToken`, `verifyAdminToken`) | ✅ Complete |
| Login rate limiting + account lockout | `middleware/rateLimiters.js`, `middleware/accountLockout.js` | ✅ Complete |
| **Reference normalization**: `departmentRef` / `programRef` / `sessionRef` / `semesterRef` / `designationRef` + `snapshotRefs(req, data)` (writes both the ObjectId and the display-name snapshot) | `validators/commonRefs.js`, `validators/resolveRef.js`, `validators/refFilters.js` | ✅ Complete — **use it for every new write route** |
| Canonical dropdown source of truth | `routes/lookups.js` → `/api/lookups/{departments,programs,sessions,semesters,designations}` | ✅ Complete — **extend, never duplicate** |
| Shared enum whitelists shared by validators + schemas | `validators/enums.js` | ✅ Complete — add new enums here only |
| Audit logging | `utils/audit.js` → `logAudit(req, { action, entityType, entityId, entityLabel, before, after })` | ✅ Complete — call on every new mutating route |
| File uploads to Cloudinary | `utils/cloudinary.js` → `createUpload('folder/name')` (multer storage) | ✅ Complete |
| Transactional email | `utils/mailer.js` (nodemailer + Gmail app password) | ✅ Exists — **extend with new templates, do not add a second mail library** |
| Consistent error responses | `utils/sendError.js` → `res.sendServerError(err)` | ✅ Complete |
| HOD assigns subjects to teachers (`OngoingClass` CRUD, 4-subject cap, 5th-subject allowance) | `routes/hodPortal.js` `POST/PATCH/DELETE /ongoing-classes`, `PATCH /teachers/:id/subject-allowance` | ✅ Works — **extend it, keep the cap logic** |
| Teachers can no longer self-assign classes | `routes/teacherPortal.js` (self-assign routes already removed) | ✅ Correct — keep it that way |
| Teacher attendance CRUD, scoped by `{ teacher: req.user.id }` + `OngoingClass` ownership check, unique `(ongoingClassId, date)` index, future-date rejection | `routes/teacherPortal.js` `/attendance*` | ✅ Works — extend the schema, keep the guards |
| Per-class attendance aggregation report | `routes/teacherPortal.js` `GET /attendance/report` | ✅ Works — but see the de-duplication task in Phase 1 |
| Result sheets, mark components, Excel import (`exceljs`), grading + CGPA | `routes/teacherPortal.js`, `utils/grading.js`, `utils/academicSummary.js` | ✅ Complete |
| Correction requests (`result-sheet` and `student-profile` types) + HOD approve/reject with department scoping | `models/CorrectionRequest.js`, `routes/hodPortal.js` `/correction-requests` | ✅ Works — **extend with a new type, do not create a second request model** |
| Dept notices with attachments, audience targeting, publish/expiry | `models/DeptNotice.js`, `routes/hodPortal.js` `/notices` | ✅ Complete |
| HOD dept result sheets, datesheets, ongoing-classes read views | `routes/hodPortal.js` | ✅ Complete |
| Semester course catalogue per program (`courses[]` with `courseTitle`, `code`, `creditHours`, `theoryLab`) | `models/SemesterCourse.js`, `routes/courses.js` | ⚠️ Exists but under-used — Phase 1 builds on it |
| Print / Save-as-PDF pattern | `@media print` blocks + `window.print()` in `frontend/pages/portal/hod.js:640`, `finance.js:912`, `student.js:2128` | ✅ Reuse this exact pattern for the timetable |
| Student dashboard already computes live attendance % | `routes/studentPortal.js` ~line 535 | ✅ Works — Phase 1 moves it to a shared util |
| Admin reports endpoints | `routes/adminPortal.js` `/reports/*` | ✅ Exists — mirror the shape for HOD reports |

## WHAT IS GENUINELY MISSING (this is your scope)

1. No timetable concept — `OngoingClass` has `days[]`, `startTime`, `endTime`, `room` as loose strings, with **no slot model, no clash detection, no credit-hour-driven session generation, no printable timetable**.
2. No credit-hour → weekly-session rules anywhere in the codebase.
3. No make-up class marker on attendance.
4. No notification system at all (`grep notification` returns only two unrelated unread-count endpoints).
5. No attendance-correction request flow (only result-sheet and student-profile corrections exist).
6. HOD sidebar has only 7 items; the required 11 sections are not there.
7. No monthly / semester departmental reports and no exam-eligibility calculation.
8. No room catalogue — `room` is free text.

## HARD RULES

1. **Do not duplicate logic.** If a calculation exists, import it. If it exists twice, consolidate it into one util and make both call sites use it. This is an explicit client requirement: *"Repeated tasks should be executed once and subsequently accessed as needed across the university's website."*
2. **Normalization is non-negotiable.** Every new model that references a department/program/session/semester/course/teacher/room stores the **ObjectId ref** and uses `snapshotRefs()` for the human-readable snapshot, exactly like `OngoingClass` does today. No new free-text foreign keys.
3. **Every new dropdown reads from `/api/lookups/*`.** If a new lookup is needed (rooms, courses, slots), add it to `routes/lookups.js` — do not invent a parallel endpoint.
4. **Department scoping on every HOD route**: filter by `req.user.department` / `departmentId` and return 403/404 for out-of-department documents, matching the pattern already in `hodPortal.js`.
5. **Teacher scoping stays tight**: every teacher route filters `{ teacher: req.user.id }` and verifies `OngoingClass` ownership before touching anything.
6. **Backwards compatibility**: existing endpoints, response shapes and saved documents must keep working. New schema fields are optional with sane defaults. Never drop a field.
7. **Validators + audit on every new mutating route** — `express-validator` chains from `validators/`, then `validate`, then `logAudit`.
8. **No new heavy dependencies** without asking me first. `exceljs`, `nodemailer`, `multer`, `cloudinary`, `qrcode` are already available on the backend; the frontend has `axios`, `framer-motion`, `lucide-react`, `react-hook-form`, Tailwind.
9. **Frontend files are already huge** (`hod.js` is 1,423 lines, `teacher.js` is 3,271). Do not keep growing them. Extract each new section into `frontend/components/portal/hod/<Section>.js` and move the shared `Alert` / `StatCard` / `inputCls` / `labelCls` primitives into `frontend/components/portal/ui.js`, then reuse them across all five portals.
10. **Ask before destructive migrations.** Write migration scripts into `backend/scripts/` following `backfillRefs.js`; never mutate production data implicitly on boot.
11. Match the existing code style: 2-space indent, aligned `const` blocks, `router.method('/path', verifyXToken, [validators], handler)`, `try/catch` with `res.sendServerError(err)`, explanatory comments above non-obvious logic.

## AGREED DECISIONS (do not re-litigate these)

- **Alerts are in-app + email.** A `Notification` model plus a bell/inbox in each portal, and email through the existing `utils/mailer.js`.
- **Timetable is auto-suggest, HOD confirms.** The system derives the required weekly sessions from credit hours and proposes free slots/rooms; the HOD edits and confirms. Clash detection hard-blocks conflicts.
- **Exam eligibility defaults to 75% attendance, but is stored as an HOD-configurable setting** per department/session — not hard-coded.
- Deployment is serverless-ish (`vercel.json`, `nixpacks.toml`), so scheduled jobs must be an **externally-triggered secured endpoint**, not an in-process `setInterval`.

---

---

# PART 2 — THE WORK: PHASE 3 — Attendance: make-up classes and absence alerts

### 3.1 Make-up classes

Extend `models/Attendance.js` (all fields optional, defaults preserve current behaviour):

```js
timetableSlot: ObjectId,          // ref TimetableSlot, optional
isMakeup:      { type: Boolean, default: false },
makeupFor:     Date,              // the missed class date this replaces
makeupReason:  { type: String, default: '', maxlength: 500 },
kind:          { enum: ['theory','lab'], default: 'theory' },
```

⚠️ The unique index is currently `{ ongoingClassId: 1, date: 1 }`. A make-up class can legitimately fall on a day that already has a regular session for that class. Change it to a **partial unique index** on `{ ongoingClassId: 1, date: 1, isMakeup: 1 }`, and write `backend/scripts/fixAttendanceIndex.js` following the existing `backend/fixIndexes.js` to drop the old index and build the new one safely. Verify the duplicate-key error message in `routes/teacherPortal.js` still makes sense after the change.

In `POST /api/portal/teacher/attendance` and `PATCH .../:id`: accept the new fields, require `makeupFor` and `makeupReason` when `isMakeup === true`, validate that `makeupFor` is in the past and not more than 60 days ago, and include the make-up marker in the `logAudit` entry.

Everywhere attendance is displayed — teacher list, HOD attendance view, student attendance view, printed reports — a make-up session must be visibly labelled: **"Make-up class (held 12 Mar 2026, for the class missed on 5 Mar 2026)"**. Not a subtle icon; a readable line.

Teacher UI: in the existing "✅ Take Attendance" panel (`frontend/pages/portal/teacher.js` around line 1212), add a "This is a make-up class" checkbox that reveals the missed-date picker and reason field.

### 3.2 Automatic absence alerts

Event-driven, not polled: inside the attendance `POST` and `PATCH` handlers, **after** a successful save, resolve every record with status `Absent` (and `Late`, if `DeptSetting` says so) to a `Student` by `registrationNo`, and call `notifyMany()`:

- category `attendance`, priority `normal`
- title: `Marked absent — <subject>`
- body: `You were marked absent in <subject> (<className>) on <date>. If this is incorrect, submit an attendance correction request with supporting documents within <N> days.`
- link: `/portal/student?tab=attendance`
- `dedupeKey`: `absence:<attendanceId>:<registrationNo>` — so editing the sheet later never re-alerts for the same session.
- Email through `notify()`.

Alert delivery must never fail the attendance save: wrap in try/catch, log, continue. The teacher's response should include `{ notified: <n> }` so the UI can confirm.

Then add the **threshold** alerts to the daily job (Phase 4's runner):
- N consecutive absences in one course (`consecutiveAbsenceAlertThreshold`, default 3) → alert student **and** the course teacher **and** the HOD.
- Attendance in any course dropping below `minAttendancePercent` (default 75) → "exam eligibility at risk" alert to the student, copied to the HOD. Use `utils/attendanceSummary.js` from Phase 1 — do not recompute.

### Phase 3 acceptance checklist

- [ ] A regular session and a make-up session can both exist for the same class on the same date; two regular sessions on one date still cannot.
- [ ] `fixAttendanceIndex.js` runs cleanly on a database with existing attendance and is safe to re-run.
- [ ] Saving attendance with 4 absentees creates exactly 4 notifications and sends 4 emails; re-saving the same sheet creates 0 more.
- [ ] An email/SMTP outage still lets the attendance save succeed (simulate by breaking `GMAIL_APP_PASSWORD`).
- [ ] The make-up label renders in the teacher list, HOD view, student view and print output.

---
