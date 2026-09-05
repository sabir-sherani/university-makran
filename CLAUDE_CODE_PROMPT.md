# Claude Code Implementation Prompt — UMS Timetable, Attendance & HOD Portal

**How to use this file**

1. Open `university-website/` in VS Code with the Claude Code agent.
2. Paste **Block A (Shared Context)** at the start of every new session.
3. Then paste **one phase at a time** (Phase 1 → Phase 6). Do not paste more than one phase per run — each phase is sized to finish cleanly.
4. After each phase, run the phase's Acceptance Checklist before moving on.

Work on a branch: `git checkout -b feat/timetable-attendance-hod`

---

# BLOCK A — SHARED CONTEXT (paste this first, every session)

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

# PHASE 1 — Foundation: course catalogue, credit-hour policy, notifications, de-duplication

**Goal:** put the shared, normalized building blocks in place. Almost nothing is user-visible after this phase — that is expected.

### 1.1 Normalize the course catalogue

`models/SemesterCourse.js` already stores per-program, per-semester `courses[]` with `courseTitle`, `code`, `creditHours`, `theoryLab`. Right now `OngoingClass.subject` is free text that has no link to it — so the same subject is retyped for every section. Fix that:

- Create `models/Course.js` — the canonical course record: `code` (unique per program, uppercase, trimmed), `title`, `creditHours` (Number, 1–6), `isLab` (Boolean, derived from `theoryLab`), `program`/`programId`, `department`/`departmentId`, `semesterNumber` (1–8), `isActive`, `deletedAt`. Index `{ programId: 1, code: 1 }` unique.
- Write `backend/scripts/migrateSemesterCoursesToCourses.js` (idempotent, dry-run flag first, following `scripts/backfillRefs.js`) that reads every `SemesterCourse` document and upserts the corresponding `Course` records. Do not delete `SemesterCourse` — `routes/courses.js` and the public department pages still read it. Keep them in sync from `routes/courses.js` writes going forward.
- Add `GET /api/lookups/courses?program=<id>&semester=<n>&department=<id>` to `routes/lookups.js`, mirroring the existing handlers (ObjectId validation, `*_ACTIVE` filter, `.select()`, sorted).
- Add `courseRef()` to `validators/commonRefs.js` and teach `snapshotRefs()` to write `{ courseId, courseCode, subject }` — reuse the existing `subject` string as the snapshot so no existing consumer breaks.
- Add optional `courseId` + `creditHours` + `isLab` fields to `models/OngoingClass.js`. When the HOD assigns a class by `courseId`, snapshot title/credit hours/lab flag onto the OngoingClass. Free-text `subject` must keep working for legacy rows.

### 1.2 Credit-hour policy as data, not code

Create `models/CreditHourPolicy.js` — one document per `(departmentId, creditHours, isLab)` combination:

```js
{
  departmentId, department,        // null/'' = university-wide default
  creditHours: Number,             // 1..6
  isLab: Boolean,
  sessions: [{                     // the weekly sessions this course requires
    kind: { type: String, enum: ['theory', 'lab'] },
    durationMinutes: Number,
    count: Number,
  }],
  isActive: Boolean,
}
```

Seed defaults in `backend/scripts/seedCreditHourPolicies.js` (idempotent upsert):

| Credit hours | Lab? | Weekly sessions |
|---|---|---|
| 1 | no | 1 × 60 min theory |
| 2 | no | 2 × 60 min theory |
| **3** | **no** | **2 × 90 min theory** (the client's stated rule) |
| 3 | yes | 2 × 90 min theory |
| **4** | **yes** | **2 × 90 min theory + 1 × 60 min lab** (the client's stated rule) |
| 4 | no | 2 × 120 min theory |

Expose it read/write to the HOD (`GET/PATCH /api/portal/hod/credit-hour-policies`, department-scoped) and read-only via `GET /api/lookups/credit-hour-policies`. Add `utils/creditHours.js` exporting `requiredSessionsFor({ creditHours, isLab, departmentId })` → `[{ kind, durationMinutes }, …]` — **this one function is the single source of truth for the 3CR/4CR rules across the entire app.**

### 1.3 Department settings

Create `models/DeptSetting.js`: `{ departmentId, department, sessionId, minAttendancePercent (default 75), absenceAlertEnabled (default true), consecutiveAbsenceAlertThreshold (default 3), documentReminderHours (default 48), workingDays [String], morningWindow {start,end}, eveningWindow {start,end}, slotGranularityMinutes (default 30) }`. Upsert-on-read so a missing document behaves as defaults. HOD-editable at `GET/PATCH /api/portal/hod/settings`.

### 1.4 Notification infrastructure

Create `models/Notification.js`:

```js
{
  recipientRole: { enum: ['student','teacher','hod','exam','admin'] },
  recipient:     ObjectId,          // indexed with recipientRole
  category:      { enum: ['attendance','document','approval','timetable','result','notice','system'] },
  title, body,
  entityType, entityId,             // deep-link target
  link:          String,            // e.g. '/portal/student?tab=attendance'
  priority:      { enum: ['normal','important','urgent'], default: 'normal' },
  isRead:        { type: Boolean, default: false },
  readAt:        Date,
  emailSent:     { type: Boolean, default: false },
  emailError:    String,
  dedupeKey:     { type: String, index: { unique: true, sparse: true } },
}
```

`dedupeKey` is what stops the cron from spamming the same person daily — e.g. `absence:<attendanceId>:<registrationNo>` or `docReminder:<slotId>:<yyyy-mm-dd>`.

Create `utils/notify.js`:

- `notify({ recipientRole, recipient, category, title, body, link, entityType, entityId, priority, dedupeKey, email })` — upserts on `dedupeKey` (a duplicate is a silent no-op, never an error), then, if `email !== false` and the recipient has an email, sends via a **new generic `sendNotificationEmail(to, name, title, body, link)` template added to `utils/mailer.js`** reusing the existing branded HTML shell. Email failures are caught, logged to `emailError`, and never break the calling request.
- `notifyMany([...])` — batched, tolerant of partial failure.

Create `routes/notifications.js` mounted at `/api/notifications`, working for **any** logged-in role (write a small `verifyAnyRole` helper in `middleware/auth.js` that accepts any of the existing role verifiers rather than copy-pasting five near-identical routers):

- `GET /` (paginated, `?unreadOnly=true&category=`)
- `GET /unread-count`
- `PATCH /:id/read`, `PATCH /read-all`
- `DELETE /:id`

Every query is hard-filtered by `{ recipientRole: req.user.role, recipient: req.user.id }`.

### 1.5 De-duplicate what is already duplicated

Attendance percentage is currently computed in **two** places with slightly different rules (`routes/studentPortal.js` ~line 535 and `routes/teacherPortal.js` `GET /attendance/report`). Create `utils/attendanceSummary.js` exporting:

- `summarizeSessions(sessions)` → per-student `{ registrationNo, studentName, Present, Absent, Late, Excused, total, attendancePercent }`
- `overallPercent(sessions)` → single number
- One documented rule for what counts as attended (currently `Present + Late`) and how make-up classes and `Excused` are treated.

Then rewrite **both** call sites to import it. Verify the numbers are unchanged for existing data before and after.

### Phase 1 acceptance checklist

- [ ] `npm run dev` in `backend/` boots with no schema or index errors.
- [ ] `node scripts/migrateSemesterCoursesToCourses.js --dry-run` prints a sane plan; a second real run changes nothing (idempotent).
- [ ] `GET /api/lookups/courses?program=<id>` returns the catalogue.
- [ ] `requiredSessionsFor({ creditHours: 3, isLab: false })` → `[{theory,90},{theory,90}]`; `{ creditHours: 4, isLab: true }` → `[{theory,90},{theory,90},{lab,60}]`.
- [ ] Creating the same notification twice with one `dedupeKey` yields exactly one document.
- [ ] Student dashboard attendance % and teacher attendance report are byte-identical to before the refactor.
- [ ] No existing route's response shape changed. Confirm by diffing responses for `/api/portal/hod/ongoing-classes`, `/api/portal/teacher/attendance/report`, `/api/portal/student/dashboard`.

---

# PHASE 2 — Timetable: slots, clash detection, auto-suggest, printable output

**Goal:** the HOD decides who teaches what, in which room, in which slot — and the result prints.

### 2.1 Rooms as a lookup, not free text

Create `models/Room.js`: `{ code (unique), name, departmentId/department (nullable = shared), building, capacity, type: enum ['classroom','lab','seminar'], isActive, deletedAt }`. Admin CRUD in `routes/adminPortal.js` (mirror the Designation CRUD block at the end of that file), HOD read + department-room CRUD, and `GET /api/lookups/rooms?department=&type=&capacityAtLeast=`. Keep `OngoingClass.room` string as the snapshot; add `roomId`.

### 2.2 The timetable model

Create `models/TimetableSlot.js` — **one document per weekly recurring session** (a 3CR course therefore has exactly two slot documents, a 4CR lab course three):

```js
{
  departmentId, department,
  programId, program,
  sessionId, academicSession,       // AcademicSession
  semesterNumber: Number,           // 1..8
  timeSession: { enum: ['Morning','Evening'] },
  sectionKey: String,               // computed: `${programId}:${semesterNumber}:${timeSession}` — the "class"
  courseId, courseCode, subject,    // snapshot per rule 2
  ongoingClass: ObjectId,           // ref OngoingClass — the teacher assignment this slot belongs to
  teacher: ObjectId, teacherName, teacherId,
  roomId, room,
  kind: { enum: ['theory','lab'] },
  day: { enum: ['Monday',…,'Saturday'] },
  startTime: String,                // 'HH:mm', 24h, validated
  endTime:   String,                // derived from durationMinutes, validated
  durationMinutes: Number,
  status: { enum: ['active','cancelled'], default: 'active' },
  createdBy, createdByRole,
}
```

Indexes: `{ teacher: 1, day: 1, startTime: 1 }`, `{ roomId: 1, day: 1, startTime: 1 }`, `{ sectionKey: 1, day: 1, startTime: 1 }`, `{ ongoingClass: 1 }`.

### 2.3 Clash detection — `utils/timetableClash.js`

`findClashes(candidateSlot, { excludeSlotId })` returns an array of human-readable conflicts. Three rules, all checked against `status: 'active'` slots in the same `sessionId`:

1. **Teacher clash** — same teacher, same day, overlapping `[start, end)`.
2. **Room clash** — same `roomId`, same day, overlapping interval.
3. **Section clash** — same `sectionKey`, same day, overlapping interval (a semester's students can't be in two places).

Plus soft warnings (returned separately, do not block): slot outside the department's `morningWindow`/`eveningWindow`, room capacity below the section's student count, a teacher with more than 3 back-to-back sessions, a day with more sessions than `workingDays` policy allows.

Overlap test must be inclusive-exclusive (`aStart < bEnd && bStart < aEnd`) so a 10:30 end and a 10:30 start do **not** collide. Write unit-style assertions for this in `backend/scripts/testTimetableClash.js` — boundary bugs here are the single most likely defect in this phase.

### 2.4 Auto-suggest — `utils/timetableSuggest.js`

`suggestSlots({ ongoingClassId })`:

1. Load the OngoingClass → its `courseId` → `creditHours` + `isLab`.
2. Call `requiredSessionsFor()` from Phase 1 to get the required session shape (this is where the 3CR/4CR rule is applied — **do not re-implement it here**).
3. Subtract slots that already exist for this OngoingClass, so re-running only proposes what's still missing.
4. For each missing session, walk the department's working days × the time-session window in `slotGranularityMinutes` steps, and return the first N candidate `{ day, startTime, endTime, roomId, room }` combinations that produce **zero** clashes, preferring: different days for the same course (never two sessions of one course on one day unless nothing else fits), a room already used by that section, and the earliest free slot.
5. Return `{ required: [...], existing: [...], suggestions: [...], unplaceable: [...] }` — suggestions are **proposals only**; nothing is saved.

### 2.5 HOD timetable API — add to `routes/hodPortal.js`

- `GET /timetable?sessionId=&programId=&semesterNumber=&timeSession=&teacherId=&roomId=&day=` — department-scoped, returns slots plus a `grid` shape ready for rendering (days × time rows).
- `GET /timetable/requirements?sessionId=&programId=&semesterNumber=` — per course: required sessions vs scheduled, so the HOD sees at a glance that "CS-301 (3CR) has 1 of 2 sessions scheduled".
- `POST /timetable/suggest` `{ ongoingClassId }` → the suggestion payload above.
- `POST /timetable` — create one slot. Validate, run `findClashes`, **reject with 409 and the full conflict list** if any hard clash. Return soft warnings in the success body.
- `POST /timetable/bulk` — accept an array (used by "Accept all suggestions"). All-or-nothing: validate every slot against the DB *and against the others in the batch* first, then insert.
- `PATCH /timetable/:id`, `DELETE /timetable/:id` — same clash checks, same department scoping, `logAudit` on all of them.
- Guard: refuse to create slots for an `OngoingClass` outside the HOD's department, or for a cancelled/completed class.

### 2.6 Read-only timetable for the other roles

- `GET /api/portal/teacher/timetable` → `{ teacher: req.user.id }` only.
- `GET /api/portal/student/timetable` → resolved from the student's `programId` + `currentSemester` + `timeSession` → `sectionKey`.
- `GET /api/portal/admin/timetable` → all departments, filterable.

All three call the **same** grid-building helper (`utils/timetableGrid.js`). One implementation, four consumers.

### 2.7 Timetable UI

New component `frontend/components/portal/TimetableGrid.js` — a days × periods table, colour-coded by `kind` (theory/lab), showing course code, teacher, room. Props-driven, no role-specific logic inside it, so all four portals render the identical grid.

HOD **Timetable** section (`frontend/components/portal/hod/TimetableSection.js`):
- Filter bar: session, program, semester, Morning/Evening.
- Requirements panel showing scheduled-vs-required per course, with the shortfall highlighted in red.
- "Suggest slots" button per unscheduled course → a review modal listing proposals with per-row Accept / Edit / Skip, then "Accept selected".
- Manual add/edit modal: course → teacher (only teachers of this department, showing their current load) → day → start time → duration (pre-filled from policy) → room (only rooms free at that time, from the lookup). Clash errors render as a red list, never a generic toast.
- Drag-free, keyboard-accessible edit — this is administrative software, do not build a drag-and-drop scheduler.

**Print & download** (an explicit client requirement):
- Reuse the existing print pattern — a `@media print` block that hides the sidebar/filters and prints only the grid, plus a `🖨 Print / Save PDF` button calling `window.print()`. Copy the working implementation at `frontend/pages/portal/hod.js:640` and `finance.js:912`; do not add a PDF library.
- Landscape print CSS (`@page { size: A4 landscape; margin: 10mm; }`), department + program + semester + session in a print-only header, and a "Generated on <date>" footer.
- `GET /api/portal/hod/timetable/export.xlsx` — build the grid with **exceljs** (already a backend dependency; see the result-sheet export in `teacherPortal.js` for the working pattern), one sheet per section, merged cells for multi-period sessions.
- Same print button on the teacher and student timetable views.

### Phase 2 acceptance checklist

- [ ] Assigning a 3CR course produces exactly 2 required sessions of 90 min; a 4CR lab course produces 2 × 90 theory + 1 × 60 lab, and the requirements panel says so.
- [ ] Booking the same teacher into two overlapping slots returns 409 naming the conflicting course, day and time.
- [ ] Same for a room double-booking and for two courses of the same section overlapping.
- [ ] A slot ending at 10:30 and another starting at 10:30 is **allowed**.
- [ ] `POST /timetable/bulk` with two mutually-clashing rows inserts neither.
- [ ] "Suggest slots" on a course that already has 1 of 2 sessions proposes exactly 1 more.
- [ ] Print preview shows a clean landscape grid with the header, no sidebar, no buttons.
- [ ] The `.xlsx` export opens in Excel with the same content as the screen.
- [ ] Teacher and student timetable endpoints leak nothing outside their own scope (test with a second account's token).

---

# PHASE 3 — Attendance: make-up classes and absence alerts

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

# PHASE 4 — Faculty document reminders + notification inbox UI

### 4.1 The scheduled-job runner

There is no scheduler in this project and the deployment targets are serverless (`vercel.json`, `nixpacks.toml`), so **do not use `setInterval` or `node-cron` in the request process.** Instead:

- `backend/jobs/dailyJobs.js` exporting `runDailyJobs({ now })` → `{ absenceThresholdAlerts, documentReminders, eligibilityWarnings, errors }`. Pure and re-runnable: every notification it creates carries a date-stamped `dedupeKey`, so running it five times a day produces one alert.
- `backend/routes/jobs.js` → `POST /api/jobs/daily`, protected by a `x-job-secret` header compared against `process.env.JOB_SECRET` in constant time, plus a strict rate limiter. Returns the summary JSON.
- `backend/scripts/runDailyJobs.js` for manual/local invocation.
- Document in `DEPLOYMENT.md` how to wire it: Vercel Cron / Railway scheduled job / GitHub Action hitting the endpoint once a day at 06:00 PKT. Add `JOB_SECRET` to `backend/.env.example`.

### 4.2 Faculty document reminders

Inside `runDailyJobs`, for each active department:

| Trigger | Recipient | Escalation |
|---|---|---|
| A `TimetableSlot` whose class occurred more than `documentReminderHours` ago with no matching `Attendance` document | Teacher | HOD copied after 3 unheeded days |
| A `ResultSheet` still in `draft` past its exam's `DateSheet` date + grace period | Teacher | HOD + Exam section after the grace period |
| An `Assignment` past due with ungraded `AssignmentSubmission`s | Teacher | HOD after 7 days |
| A `CorrectionRequest` pending HOD review for more than 3 days | HOD | Admin after 7 days |

Each with a distinct `category` and a `dedupeKey` of the form `docReminder:<type>:<entityId>:<yyyy-mm-dd>` (so it reminds daily but only once per day). Keep the rules in a small declarative array at the top of `dailyJobs.js` — one entry per rule — rather than four hand-written blocks.

### 4.3 Notification inbox UI

`frontend/components/portal/NotificationBell.js` — one component, used unchanged in all five portals (`hod.js`, `teacher.js`, `student.js`, `exam.js`, `finance.js`):

- Unread badge polling `GET /api/notifications/unread-count` every 60s (pause when the tab is hidden).
- Dropdown panel: grouped by day, category icon, priority colour, unread dot, click → mark read + navigate to `link`.
- "Mark all read", filter by category, "View all" opening a full-page list.

Add it to each portal's header. Do not fork the component per role.

### Phase 4 acceptance checklist

- [ ] `node scripts/runDailyJobs.js` prints a summary and creates notifications; running it twice in one day creates no duplicates.
- [ ] `POST /api/jobs/daily` without the correct secret returns 401 and is rate-limited.
- [ ] A teacher who has not marked attendance for a slot that ran 3 days ago receives one reminder per day, and the HOD is copied on day 3.
- [ ] The bell renders and functions identically in all five portals.
- [ ] Notifications for one user are never visible to another (test with two tokens).

---

# PHASE 5 — Attendance correction requests with supporting documents

**Only HOD approval is required**, and approval must actually mutate the attendance record.

### 5.1 Extend the existing model — do not create a new one

In `models/CorrectionRequest.js`, add `'attendance'` to the `type` enum and these fields:

```js
attendanceSession:  ObjectId,     // ref Attendance
timetableSlot:      ObjectId,
ongoingClassId:     ObjectId,
classDate:          Date,
currentStatus:      { enum: ['Present','Absent','Late','Excused'] },
requestedStatus:    { enum: ['Present','Absent','Late','Excused'] },
attachments:        [{ fileUrl, fileName, uploadedAt }],
appliedAt:          Date,         // set when the approved change is written through
```

Keep every existing field and default intact — the `result-sheet` and `student-profile` flows must not change behaviour.

### 5.2 Student side — `routes/studentPortal.js`

- `GET /attendance` — the student's own sessions across their enrolled classes (reuse `utils/attendanceSummary.js`), per-course percentage, eligibility flag against `minAttendancePercent`, and a per-session correction status where one exists.
- `POST /attendance-corrections` with `createUpload('portal/attendance-corrections').array('files', 5)` — accepts `attendanceSessionId`, `requestedStatus`, `reason` (required, 20–1000 chars) and 1–5 attachments (PDF/JPG/PNG, ≤5 MB each — enforce in the multer `fileFilter`, and reject a request with zero attachments since supporting documents are the point).
  Guards: the session must contain this student's `registrationNo`; the class date must be within a configurable window (default 14 days); no existing `pending` request for the same session+student; the `department` is snapshotted from the student so the existing HOD department filter works unchanged.
  On success: `logAudit`, then `notify()` the HOD (category `approval`, priority `important`) and the course teacher (informational).
- `GET /attendance-corrections` — the student's own request history with status and reviewer comment.

### 5.3 HOD side — `routes/hodPortal.js`

The existing `GET /correction-requests` and `PATCH /correction-requests/:id` already filter by department and block re-review. **Extend them rather than adding parallel routes:**

- Add `?type=attendance` filtering and return attachments in the list payload.
- In the `PATCH` handler, branch on `cr.type`: the existing `result-sheet` branch (set `ResultSheet` back to `draft`) stays exactly as it is; add an `attendance` branch that, on `approved`, loads the `Attendance` document, finds the record by `registrationNo`, writes `requestedStatus`, saves, sets `cr.appliedAt`, and writes a `logAudit` entry with the full before/after of that record.
- On both approve and reject, `notify()` the student with the outcome and the reviewer comment, and notify the teacher when an approval changes their sheet.
- If the underlying `Attendance` document was deleted, fail with a clear 409 and leave the request pending — never silently approve a change that cannot be applied.
- Explicitly: no admin or exam-section approval path for `type: 'attendance'`. Admin may read them via the existing `/reports/corrections` endpoint but must not be able to approve — enforce this server-side, not just in the UI.

### 5.4 UI

- **Student portal**: an Attendance tab — per-course percentage bars with the 75% line, a session list, and a "Request correction" button on any Absent/Late session that opens a modal (requested status, reason, file upload with client-side type/size validation and a visible upload progress state), plus a "My requests" list with status badges.
- **HOD portal**: the existing corrections section grows a type filter and an attendance-request card showing student, course, date, current → requested status, reason, attachment thumbnails/links (open in a new tab), and Approve / Reject with a mandatory comment on reject.

### Phase 5 acceptance checklist

- [ ] A student cannot file a request for a session they are not in, for another student, or without an attachment.
- [ ] Approving flips the exact record in the `Attendance` document and nothing else; the student's percentage recalculates on the next load.
- [ ] Rejecting changes no attendance data and stores the reviewer comment.
- [ ] A second HOD from another department gets 403 on the same request.
- [ ] Admin and exam tokens cannot approve an attendance-type request (verify with a direct API call, not just the UI).
- [ ] The `result-sheet` and `student-profile` correction flows still work unchanged.
- [ ] Audit log shows before/after for every approved correction.

---

# PHASE 6 — HOD portal restructure + reports

### 6.1 Full sidebar

`frontend/pages/portal/hod.js` currently has 7 sidebar items (`dashboard, students, teachers, notices, results, ongoingClasses, corrections`). Restructure to exactly this, with badge counts on the sections that have pending work:

| Section | Contents | Build state |
|---|---|---|
| **Dashboard** | Department KPIs: students, faculty, active courses, sessions scheduled vs required, attendance % this month, pending approvals, at-risk students, today's classes | Extend the existing `/stats` |
| **Students** | Existing list + attendance %, eligibility flag, per-student drill-down | Extend existing |
| **Faculty & Staff** | Existing teacher list + workload column (courses, weekly contact hours, sessions), 5th-subject allowance toggle | Extend existing (rename tab) |
| **Courses & Workload** | Course catalogue (Phase 1), assign course → teacher (the existing `OngoingClass` flow, now course-driven), per-teacher workload summary with over/under-load warnings | Extend existing `ongoingClasses` |
| **Timetable** | Phase 2 | New |
| **Attendance** | Department-wide attendance browser: by course / teacher / section / date, make-up sessions flagged, un-marked sessions highlighted, defaulters list | New |
| **Examinations & Results** | Existing dept result sheets + datesheets + eligibility list per exam | Extend existing `results` |
| **Requests & Approvals** | Existing corrections, now with the type filter and attendance requests (Phase 5) | Extend existing `corrections` |
| **Curriculum & Accreditation** | Program → semester → course map, credit-hour totals per semester with a flag when a semester deviates from the program's expected total, theory/lab split, credit-hour policy editor (Phase 1), export | Mostly new, reads `Course`/`SemesterCourse` |
| **Notices & Calendar** | Existing notices CRUD + a month calendar overlaying exam dates (`DateSheet`), semester start/end (`Semester`), notices and make-up classes | Extend existing `notices` |
| **Reports** | 6.2 | New |
| **Profile** | HOD's own record (read-only official fields), password change, 2FA (the `/api/2fa` routes already exist) | New, wire to existing endpoints |

Extract every section into `frontend/components/portal/hod/<Name>Section.js`. `hod.js` should end up as routing + auth + layout only, well under 400 lines. Move `Alert`, `StatCard`, `inputCls`, `labelCls`, `STATUS_BADGE` into `frontend/components/portal/ui.js` and import them in all five portals, deleting the duplicated copies.

### 6.2 Reports — `routes/hodPortal.js` + `utils/reports.js`

Put every aggregation in `utils/reports.js` so the HOD routes, the admin routes and any future export share one implementation.

- `GET /reports/monthly?month=YYYY-MM&programId=&semesterNumber=` — per course: sessions held vs required (from the timetable), make-up sessions, average attendance, defaulters below threshold, un-marked sessions, per-teacher delivery rate, pending documents; department totals and a month-over-month delta.
- `GET /reports/semester?sessionId=&semesterNumber=` — enrolment, attendance distribution, pass/fail and grade distribution (reuse `utils/grading.js` and `utils/academicSummary.js` — **do not write a second grading calculation**), course-wise averages, teacher workload delivered, correction requests raised/approved, trend across the last four semesters.
- `GET /reports/exam-eligibility?sessionId=&semesterNumber=&examType=` — the operative one: every student × course with attendance %, eligible / not-eligible / borderline against `minAttendancePercent`, the shortfall in sessions needed to reach the threshold, and any pending correction request that could change the verdict (flag these — never publish an eligibility list while a relevant correction is unresolved).
- Each report: an on-screen view, the print CSS + `window.print()` pattern, and an `?format=xlsx` variant via exceljs.
- Trends must be computed from real records (`Attendance`, `ResultSheet`, `TimetableSlot`), never from the legacy denormalized `Student.attendancePercentage` / `Student.cgpa` fields — `routes/studentPortal.js` already documents why those are not trusted.

### Phase 6 acceptance checklist

- [ ] All 11 sidebar sections exist, load, and are department-scoped.
- [ ] `hod.js` is under 400 lines; every section is its own component.
- [ ] `Alert`/`StatCard`/`inputCls` exist in exactly one file and all five portals import them.
- [ ] The monthly report's session counts reconcile against a hand-count for one course.
- [ ] Eligibility percentages match `utils/attendanceSummary.js` exactly.
- [ ] A student with a pending attendance correction is flagged in the eligibility report.
- [ ] Every report prints cleanly and exports to `.xlsx`.
- [ ] Changing `minAttendancePercent` in settings changes the eligibility verdicts on reload.

---

# FINAL VERIFICATION (run after Phase 6)

Do all of this and report the results — do not declare the work done without it:

1. `cd backend && npm run dev` — clean boot, no index warnings.
2. `cd frontend && npm run build` and `cd admin-dashboard && npm run build` — both succeed with no new lint errors.
3. **Regression pass** — log in as each of student / teacher / HOD / exam / finance / admin and exercise the pre-existing features: login, profile, result sheet submission, assignment upload, fee challan, notices, dept results, correction requests, degree verification. Nothing that worked before may be broken.
4. **Authorization pass** — with a token from department A, attempt every new HOD endpoint against department B data; with a teacher token, attempt to read another teacher's timetable and attendance; with a student token, attempt another student's attendance and corrections. All must fail closed.
5. **Normalization pass** — `grep` the new code for hard-coded department/program/subject/room strings and for any second implementation of attendance %, credit-hour rules, grading, or the timetable grid. There must be exactly one of each. Report the grep output.
6. Update `DATABASE_SCHEMA.md` with the new models, `README.md` with the new env vars (`JOB_SECRET`), and `DEPLOYMENT.md` with the daily-job cron wiring.
7. Write `MIGRATION.md` listing, in order, the scripts to run against an existing database and what each one does.
8. Commit per phase with a clear message; do not push without asking.

If you hit a decision I have not specified — a default value, a UX trade-off, a schema choice with two reasonable answers — **stop and ask me** rather than picking one and burying it in the diff.
