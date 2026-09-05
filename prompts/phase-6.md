<!-- Self-contained instruction file for the Claude Code agent.
     Paste into the agent:  Read prompts/phase-6.md and do exactly what it says.  -->

# PHASE 6 — HOD portal restructure + reports

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

# PART 2 — THE WORK: PHASE 6 — HOD portal restructure + reports

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
