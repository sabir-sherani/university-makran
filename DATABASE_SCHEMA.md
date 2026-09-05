# Database Schema Overview

## Collections Structure

### Department
```javascript
{
  _id: ObjectId,
  name: String,           // "Department of Science"
  head: String,          // Department head name
  description: String,   // Department description
  facilities: [String],  // List of facilities
  createdAt: Date,
  updatedAt: Date
}
```

### Program
```javascript
{
  _id: ObjectId,
  category: String,        // "Arts" | "Science" | etc
  duration: String,        // "2 Years" | "4 Years"
  subjects: [String],      // ["Physics", "Chemistry", ...]
  departmentId: ObjectId,  // Reference to department
  createdAt: Date,
  updatedAt: Date
}
```

### Facility
```javascript
{
  _id: ObjectId,
  name: String,           // "Physics Laboratory"
  description: String,    // Facility description
  features: [String],     // ["Spectrometers", "Oscilloscopes", ...]
  departmentId: ObjectId, // Reference to department
  createdAt: Date,
  updatedAt: Date
}
```

### Student
```javascript
{
  _id: ObjectId,
  studentId: String,       // Unique: "2023-001"
  name: String,
  email: String,          // Unique
  phone: String,
  password: String,       // Hashed
  program: String,
  semester: Number,
  cgpa: Number,
  enrolledCourses: [String],
  status: String,         // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Employee
```javascript
{
  _id: ObjectId,
  empId: String,          // Unique: "EMP-2020-001"
  name: String,
  email: String,          // Unique
  phone: String,
  password: String,       // Hashed
  designation: String,    // "Professor" | "Lecturer" | etc
  department: String,
  courses: [String],
  status: String,         // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Admission
```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String,
  phone: String,
  program: String,        // "Arts" | "Science"
  qualifications: String,
  status: String,         // "pending" | "approved" | "rejected"
  createdAt: Date,
  updatedAt: Date
}
```

### Feedback
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  category: String,       // "academic" | "facilities" | "services" | etc
  feedback: String,
  rating: Number,         // 1-10
  status: String,         // "received" | "reviewed"
  createdAt: Date,
  updatedAt: Date
```

### Degree
```javascript
{
  _id: ObjectId,
  degreeId: String,       // Unique: "UMP-2024-001"
  studentName: String,
  program: String,
  degree: String,         // "Bachelor of Science"
  graduationDate: Date,
  verified: Boolean,
  institution: String,    // "University of Makran, Panjgur"
  createdAt: Date,
  updatedAt: Date
}
```

### Contact
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  status: String,         // "new" | "read" | "replied"
  createdAt: Date,
  updatedAt: Date
}
```

---

## Timetable / Attendance / HOD Portal Additions (feat/timetable-attendance-hod)

The collections below are new or gained fields on this branch. They live alongside
the real Mongoose models in `backend/models/` — this section documents what changed,
it isn't a replacement for the (already stale, pre-existing) collections documented
above.

### Course (new)
Canonical per-program, per-semester course catalogue — what `OngoingClass.subject`
used to be a free-text guess at. `SemesterCourse` stays the source of truth for the
admin dashboard's Courses page and the public department pages; `Course` is the
normalized copy that HOD subject-assignment, the timetable and the transcript link
to by ObjectId. Migrated from `SemesterCourse.courses[]` via
`backend/scripts/migrateSemesterCoursesToCourses.js`.
```javascript
{
  _id: ObjectId,
  code: String,            // unique per program, uppercased
  title: String,
  creditHours: Number,     // 1-6, default 3
  isLab: Boolean,          // derived from SemesterCourse's "3+0"/"2+1" theoryLab string
  program: String, programId: ObjectId,     // ref Program
  department: String, departmentId: ObjectId, // ref Department
  semesterNumber: Number,  // 1-8
  isActive: Boolean,
  deletedAt: Date,
}
// unique index: { programId: 1, code: 1 }
```

### CreditHourPolicy (new)
Data-driven replacement for hard-coding "3 credit hours = two 90-minute sessions a
week" anywhere in application code. One document per `(departmentId, creditHours,
isLab)`; `departmentId: null` is the university-wide default consulted when a
department has no override. Every caller must go through
`requiredSessionsFor()` in `backend/utils/creditHours.js` rather than re-deriving
this rule — see the normalization pass in the final-check acceptance results.
```javascript
{
  _id: ObjectId,
  departmentId: ObjectId | null,  // ref Department; null = university-wide default
  department: String,
  creditHours: Number,   // 1-6
  isLab: Boolean,
  sessions: [{ kind: 'theory'|'lab', durationMinutes: Number, count: Number }],
  isActive: Boolean,
}
// unique partial indexes on (departmentId, creditHours, isLab) and (creditHours, isLab) when departmentId is null
```
Seeded via `backend/scripts/seedCreditHourPolicies.js`.

### DeptSetting (new)
One document per `(departmentId, sessionId)` — HOD-configurable knobs that used to
be implicit (75% attendance-for-exam-eligibility threshold, absence-alert behavior,
the attendance-correction request window, etc). A missing document behaves as
all-defaults via `DeptSetting.getOrDefault(departmentId, sessionId)` rather than an
error, so nothing needs to pre-create these.
```javascript
{
  _id: ObjectId,
  departmentId: ObjectId, department: String,   // ref Department
  sessionId: ObjectId, session: String,          // ref AcademicSession
  minAttendancePercent: Number,        // default 75 — the exam-eligibility threshold
  absenceAlertEnabled: Boolean,        // default true
  alsoAlertOnLate: Boolean,            // default false
  consecutiveAbsenceAlertThreshold: Number, // default 3
  attendanceCorrectionWindowDays: Number,   // default 14
  documentReminderHours: Number,       // default 48
  resultSheetGraceDays: Number,        // default 3
  workingDays: [String],               // default Mon-Sat
  morningWindow: { start: String, end: String },  // "HH:MM", default 08:00-12:00
  eveningWindow: { start: String, end: String },  // default 14:00-18:00
  slotGranularityMinutes: Number,      // default 30
}
// unique index: { departmentId: 1, sessionId: 1 }
```

### Notification (new)
In-app notification/bell-inbox backing store, paired with an email send through the
existing `utils/mailer.js` (see `utils/notify.js`).
```javascript
{
  _id: ObjectId,
  recipientRole: String,  // 'student'|'teacher'|'hod'|'exam'|'admin'|'finance'
  recipient: ObjectId,    // the recipient's own document id
  category: String,       // 'attendance'|'document'|'approval'|'timetable'|'result'|'notice'|'system'
  title: String, body: String,
  entityType: String, entityId: ObjectId, link: String,
  priority: String,       // 'normal'|'important'|'urgent'
  isRead: Boolean, readAt: Date,
  emailSent: Boolean, emailError: String,
  dedupeKey: String,      // e.g. `absence:<attendanceId>:<registrationNo>` — stops a daily cron re-notifying the same thing twice
}
// index: { recipientRole: 1, recipient: 1, isRead: 1, createdAt: -1 }
// unique sparse index: { dedupeKey: 1 }
```

### Room (new)
Canonical room/venue catalogue, replacing the free-text `OngoingClass.room` string
as what the timetable actually schedules against.
```javascript
{
  _id: ObjectId,
  code: String,           // unique, uppercased
  name: String,
  departmentId: ObjectId | null,  // null = shared/university-wide room
  department: String, building: String,
  capacity: Number,       // default 40
  type: String,           // 'classroom'|'lab'|'seminar'
  isActive: Boolean, deletedAt: Date,
}
// unique index: { code: 1 }
```

### TimetableSlot (new)
One document per weekly recurring session — a 3-credit-hour course therefore has
exactly two `TimetableSlot` documents (per `requiredSessionsFor()`). Hard clash
detection (`utils/timetableClash.js`) and auto-suggest (`utils/timetableSuggest.js`)
both operate on these documents; nothing is ever scheduled without going through
the same `findClashes()` check.
```javascript
{
  _id: ObjectId,
  departmentId: ObjectId, department: String,
  programId: ObjectId, program: String,
  sessionId: ObjectId, academicSession: String,
  semesterNumber: Number,       // 1-8
  timeSession: String,          // 'Morning'|'Evening'
  sectionKey: String,           // computed `${programId}:${semesterNumber}:${timeSession}`
  courseId: ObjectId, courseCode: String, subject: String,
  ongoingClass: ObjectId,       // ref OngoingClass
  teacher: ObjectId, teacherName: String, teacherId: String,
  roomId: ObjectId, room: String,
  kind: String,                 // 'theory'|'lab'
  day: String,                  // Monday-Saturday
  startTime: String, endTime: String,  // "HH:MM", 24h
  durationMinutes: Number,
  status: String,                // 'active'|'cancelled'
  createdBy: ObjectId, createdByRole: String, // 'admin'|'teacher'|'hod'
}
// indexes: { teacher,day,startTime }, { roomId,day,startTime }, { sectionKey,day,startTime }, { ongoingClass }
```

### Changed: OngoingClass
Added optional `courseId`/`courseCode`/`creditHours`/`isLab` (linking to the new
`Course` catalogue when a class is assigned by picking a course rather than typing
a subject) and `roomId` (linking to the new `Room` catalogue). All are nullable —
legacy rows and free-text assignment keep working unchanged. `createdByRole` enum
extended to include `'hod'`.

### Changed: Attendance
Added make-up class support (Phase 3), all optional/defaulted so existing rows are
unaffected: `timetableSlot` (ref TimetableSlot), `isMakeup` (Boolean, default
false), `makeupFor` (Date — the missed class date this session replaces),
`makeupReason` (String), `kind` ('theory'|'lab'). The unique index moved from
`(ongoingClassId, date)` to `(ongoingClassId, date, isMakeup)` so a make-up session
can share a date with a regular session for the same class — see
`backend/scripts/fixAttendanceIndex.js`.

### Changed: CorrectionRequest
`type` enum extended with `'attendance'` (Phase 5) alongside the existing
`'result-sheet'` and `'student-profile'`. New fields (used only by the attendance
type): `attendanceSession`/`timetableSlot`/`ongoingClassId`/`classDate` (which
session this is about), `currentStatus`/`requestedStatus` (both from the shared
`ATTENDANCE_STATUS` enum), `attachments` (`{fileUrl, fileName, uploadedAt}[]` —
required supporting documents), `appliedAt` (set when an approved status change is
written through to the underlying `Attendance` document).

### Changed: ResultSheet
Added an optional per-component marks breakdown: `hasLab` (Boolean) plus, per
entry, `sessionalMarks`/`labMarks`/`quizMarks`/`presentationMarks`/
`assignmentMarks`/`midMarks`/`finalMarks` (all nullable — sheets that don't use the
breakdown keep setting `obtainedMarks` directly, exactly as before). The sheet-level
`markComponents` object holds the max marks per component; which subset applies
depends on `hasLab` (lab subjects: sessional+lab+mid+final; non-lab: quiz+
presentation+assignment+mid+final).

### Changed: Teacher
Added `extraSubjectAllowed` (Boolean, default false) — the HOD-granted exception
that raises a teacher's active-subject cap from 4 to 5, checked in
`routes/hodPortal.js`'s ongoing-class assignment route.

## Database Setup

### Using MongoDB Locally
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Create database: `university_makran`

### Using MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Update MONGO_URI in backend/.env

### Seeding Initial Data
Use admin dashboard or direct MongoDB operations to add:
- 4 Departments
- 6 Programs
- 6 Facilities

## Indexes (Recommended)

For production, create these indexes for better performance:

```javascript
// Student indexes
db.students.createIndex({ studentId: 1 }, { unique: true })
db.students.createIndex({ email: 1 }, { unique: true })

// Employee indexes
db.employees.createIndex({ empId: 1 }, { unique: true })
db.employees.createIndex({ email: 1 }, { unique: true })

// Degree indexes
db.degrees.createIndex({ degreeId: 1 }, { unique: true })

// Admission indexes
db.admissions.createIndex({ email: 1 })
db.admissions.createIndex({ status: 1 })

// Feedback indexes
db.feedbacks.createIndex({ email: 1 })
db.feedbacks.createIndex({ category: 1 })
```

## Backup & Recovery

### Backup MongoDB
```bash
mongodump --db university_makran --out ./backups
```

### Restore MongoDB
```bash
mongorestore ./backups
```
