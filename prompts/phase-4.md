<!-- Self-contained instruction file for the Claude Code agent.
     Paste into the agent:  Read prompts/phase-4.md and do exactly what it says.  -->

# PHASE 4 — Faculty document reminders + notification inbox UI

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

# PART 2 — THE WORK: PHASE 4 — Faculty document reminders + notification inbox UI

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
