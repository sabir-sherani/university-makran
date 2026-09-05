<!-- Self-contained instruction file for the Claude Code agent.
     Paste into the agent:  Read prompts/phase-1.md and do exactly what it says.  -->

# PHASE 1 — Foundation: course catalogue, credit-hour policy, notifications, de-duplication

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

# PART 2 — THE WORK: PHASE 1 — Foundation: course catalogue, credit-hour policy, notifications, de-duplication

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
