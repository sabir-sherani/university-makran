<!-- Self-contained instruction file for the Claude Code agent.
     Paste into the agent:  Read prompts/phase-2.md and do exactly what it says.  -->

# PHASE 2 — Timetable: slots, clash detection, auto-suggest, printable output

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

# PART 2 — THE WORK: PHASE 2 — Timetable: slots, clash detection, auto-suggest, printable output

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
