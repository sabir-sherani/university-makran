# Workflow Demo — University of Makran, Panjgur

A click-by-click script that walks one student through the entire system: registration, admin approval, fee challan + payment, attendance, a graded result sheet, and a department notice — finishing with the admin dashboard's stats and audit trail showing every action that happened along the way.

Every step below was executed and verified against a live run of all three apps (see [Verification notes](#verification-notes) at the end for exactly what was tested and what was fixed).

## Before you start

1. **Backend** running on `http://localhost:5000` (`cd backend && npm start`, or `node server.js`).
2. **Frontend** running on `http://localhost:3000` (`cd frontend && npm run dev`) — public site + all 5 portals (student/teacher/HOD/exam/finance).
3. **Admin dashboard** running on `http://localhost:3001` (`cd admin-dashboard && npm run dev`).
4. **Database seeded**: `cd backend && node seed.js`. This creates the official records and one demo account per role (below). It's safe to re-run — it skips anything that already exists.

## Demo credentials

Every non-admin demo account uses the same password: **`Demo@1234`**.

| Role | Portal URL | Login field | ID / Email | Password |
|---|---|---|---|---|
| Admin | `http://localhost:3001` | Email | `admin@uomp.edu.pk` | `Admin@123` |
| Teacher | `http://localhost:3000/portal/teacher` | Teacher ID | `TCH-DEMO-001` | `Demo@1234` |
| HOD (CS & IT) | `http://localhost:3000/portal/hod` | HOD ID | `HOD-DEMO-001` | `Demo@1234` |
| Examination Section | `http://localhost:3000/portal/exam` | Exam ID | `EXAM-DEMO-001` | `Demo@1234` |
| Finance Section | `http://localhost:3000/portal/finance` | Finance ID | `FIN-DEMO-001` | `Demo@1234` |
| Student | `http://localhost:3000/portal/student` | — | *registers fresh in Step 1* | *you choose* |

The admin account has 2-factor authentication **off** by default, so logging in only needs the email + password above — no OTP step. (2FA can optionally be turned on later from the admin dashboard's Security page; that's a separate feature, not needed for this demo.)

Official records seeded for the demo (all other departments/programs exist too, but the demo below stays inside this one for a clean, connected story):

- **Department:** CS & IT
- **Program:** BS Computer Science
- **Academic Session:** 2024-2028
- **Ongoing class:** *Introduction to Programming* (BSCS-1A), Semester 1, taught by the demo teacher, Mon/Wed 09:00–10:30, Room 101
- **Fee structure:** Semester 1 — Tuition Rs. 35,000 + Admission Rs. 5,000 + Library Rs. 1,000 + Sports Rs. 500 = **Rs. 41,500**, due in 30 days

---

## Step 1 — Student registers

**URL:** `http://localhost:3000/portal/student` → **Register now**

New students always start in Semester 1 (the registration form no longer asks for a starting semester — a new self-registration can't legitimately claim to already be mid-program, so that dropdown was removed to avoid confusion). Fill in the form; the four dropdowns (Department/Program/Session/Time Session) are populated live from the database, so only valid combinations can be submitted.

| Field | Value to enter |
|---|---|
| Registration Number | `UOM-2026-0150` *(format: `UOM-YYYY-NNNN` — pick any unused 4-digit number)* |
| Full Name | `Ali Reviewer Baloch` |
| Email Address | `ali.reviewer@uomp.edu.pk` |
| Phone Number | `03211234567` |
| CNIC | `66666-6666666-6` |
| Father's Name | `Zahid Ali Baloch` |
| Gender | `Male` |
| Date of Birth | any date that makes them 18+ |
| Department | `CS & IT` |
| Program | `BS Computer Science` *(list only populates after Department is chosen)* |
| Academic Session | `2024-2028` |
| Time Session | `Morning` |
| Roll Number | leave blank (optional, added later by HOD/admin) |
| Address | `Panjgur, Balochistan` |
| Password / Confirm Password | any password ≥ 8 chars with a letter and a digit |

Click **Submit Registration**.

**Expected screen:** a green success message — *"Registration submitted. Pending admin approval."* Trying to log in now with these credentials will correctly show *"Your account is pending admin approval."*

---

## Step 2 — Admin approves the student (audit-logged)

**URL:** `http://localhost:3001` → log in with the Admin credentials above → **Students** page.

Find `Ali Reviewer Baloch` / `UOM-2026-0150` in the pending list and click **Approve**.

**Expected screen:** the student's status flips to *Approved* in the table. This is recorded automatically as an audit entry (`student.status_approved`) — you'll see it in Step 12.

---

## Step 3 — Finance generates a fee challan

**URL:** `http://localhost:3000/portal/finance` → log in with the Finance credentials → **Fee Challans** tab.

Under **Generate New Challan**:

1. **Search & Select Student** — type `UOM-2026-0150` or the student's name, then select them from the results.
2. **Fee Structure** — select the Semester 1 CS & IT structure (Rs. 41,500).
3. Leave **Due Date** / **Late Fee/Day** at their defaults.
4. Click **Generate Challan**.

**Expected screen:** a new challan appears in the list with status *Generated*, a unique challan number in the form `UOMP-2026-NNNNN`, and total amount Rs. 41,500.

---

## Step 4 — Student views and prints the challan

**URL:** `http://localhost:3000/portal/student` → log in as `UOM-2026-0150` (now approved, so login succeeds) → **Fee Challans** section.

**Expected screen:** the Semester 1 challan is listed with its amount and due date. Opening it shows a printable three-copy layout (Student Copy / Bank Copy / University Copy) with the challan number, amount breakdown, and bank details.

---

## Step 5 — Finance records the payment

**URL:** back in the Finance portal → **Fee Challans** → find the same challan → **Record Payment**.

| Field | Value to enter |
|---|---|
| Payment Reference * | `HBL-DEP-DEMO-0150` *(any unique reference — this is what makes the payment traceable)* |
| Amount Paid | `41500` |
| Payment Method | `Bank Deposit, HBL` |
| Transaction / Deposit Slip No. | any value |

Submit.

**Expected screen:** the challan's status changes to *Paid*, and a receipt view becomes available showing the payment reference and paid date. This is also audit-logged (`challan.payment_recorded`).

---

## Step 6 — Teacher marks attendance

**URL:** `http://localhost:3000/portal/teacher` → log in with the Teacher credentials → **✅ Attendance** → **Take Attendance**.

1. **Select Class** — *Introduction to Programming — BSCS-1A (Semester 1)*.
2. **Date** — today.
3. Click **+ Add Student**, then fill in **Reg No** `UOM-2026-0150` and **Student Name** `Ali Reviewer Baloch`, and mark status **Present**.
4. Click **✅ Submit Attendance**.

**Expected screen:** success message *"Attendance saved successfully!"*. The session now appears under **Attendance Reports** for this class.

---

## Step 7 — Teacher submits a result sheet

**URL:** same Teacher portal → **📝 Mark Sheets** tab → create a new result sheet.

1. **Class** — *Introduction to Programming — BSCS-1A*.
2. **Exam Type** — `Final`.
3. Add a row: **Reg No** `UOM-2026-0150`, **Student Name** `Ali Reviewer Baloch`, **Obtained Marks** `85` (out of 100).
4. Save, then click **Submit** on the sheet (this moves it from *Draft* to *Submitted* — only submitted sheets can be finalized by the exam section).

**Expected screen:** the sheet's status changes to *Submitted*, and it's now read-only for the teacher until the exam section either finalizes it or returns it with remarks.

---

## Step 8 — Exam section finalizes the result

**URL:** `http://localhost:3000/portal/exam` → log in with the Exam credentials → **Result Sheets** tab.

Find the submitted *Introduction to Programming* sheet, click **✅ Finalize & Publish**, set **Passing Marks** to `50`, and confirm.

**Expected screen:** the sheet's status becomes *Finalized*; the entry for `UOM-2026-0150` shows result status **Pass** (85 ≥ 50) with a computed grade of **A**.

---

## Step 9 — Student sees the result card with GPA/CGPA

**URL:** `http://localhost:3000/portal/student` → log in as `UOM-2026-0150` → **Result Cards** section.

**Expected screen:** *Introduction to Programming* listed with 85/100 (85%), grade **A**, result **Pass**, and — because this is currently the student's only finalized course — both **Current Semester GPA** and **CGPA** showing **3.66**, computed server-side from the grade (the frontend only displays these numbers; it never calculates them itself).

---

## Step 10 — HOD posts a department notice with expiry and an attachment

**URL:** `http://localhost:3000/portal/hod` → log in with the HOD credentials → **Notices** tab → **Post a new notice**.

| Field | Value to enter |
|---|---|
| Title | `Mid-Term Exam Schedule Released` |
| Body | `The mid-term examination schedule for BS Computer Science, Semester 1, is now available. Please check your ongoing class pages for date/time details.` |
| Priority | `Urgent` |
| Expiry Date | 2 weeks from today |
| Attachment | attach any PDF, JPG, PNG, DOC, or DOCX file (the schedule, for example) |

Click **Post Notice**.

**Expected screen:** the notice appears at the top of the HOD's notice list, marked *Urgent*, with the attachment link and expiry date shown. (If you try to attach a `.txt` or other unsupported file type, you'll now get a clear *"Only these file types are allowed…"* message instead of a raw error page — see [Verification notes](#verification-notes).)

---

## Step 11 — Student sees the notice

**URL:** `http://localhost:3000/portal/student` → log in as `UOM-2026-0150` → **Notices** section.

**Expected screen:** *"Mid-Term Exam Schedule Released"* appears, marked Urgent, with the attachment downloadable and the expiry date shown. It will automatically stop appearing after the expiry date passes.

---

## Step 12 — Admin dashboard shows the stats and full audit trail

**URL:** `http://localhost:3001` (already logged in as Admin) → **Dashboard**.

**Expected screen:** stat cards reflect everything above — student counts (including the newly approved one), an unpaid/outstanding-fees figure that no longer includes the challan you just paid, and recent-activity counts.

Then go to **Activity / Audit Trail**. You should see, newest first, an unbroken chain of every action taken in this walkthrough:

1. `deptNotice.create` — HOD posted the notice (Step 10)
2. `resultSheet.finalize` — exam section finalized the sheet (Step 8)
3. `resultSheet.submit` — teacher submitted the sheet (Step 7)
4. `attendance.create` — teacher marked attendance (Step 6)
5. `challan.payment_recorded` — finance recorded the payment (Step 5)
6. `challan.generate` — finance generated the challan (Step 3)
7. `student.status_approved` — admin approved the registration (Step 2)

Each entry records who did it, their role, the exact before/after state, and a timestamp — this is the full, tamper-evident trail the university asked for.

---

## Verification notes

This script was executed end-to-end against a live run of all three apps (backend on :5000, frontend on :3000, admin-dashboard on :3001) with a real MongoDB Atlas database, using a demo student carried through every step above. Two real bugs were found and fixed along the way:

1. **Duplicate fee challan numbers.** `genChallanNo()` in `backend/routes/financePortal.js` generated the year's next challan number from an atomic counter but didn't check whether that number was already taken by an older challan created before the counter existed. First live run failed with *"Challan No … is already in use."* Fixed by having it skip forward past any number that's already taken (up to 5 attempts) instead of failing the request outright.
2. **Upload errors returned a raw HTML stack-trace page instead of JSON.** There was no global error-handling middleware in `backend/server.js`, so an error raised before a route handler runs — e.g. multer rejecting a disallowed file type or an oversized upload — fell through to Express's default HTML error page (leaking server file paths outside production) rather than the JSON error shape every other endpoint returns. Fixed by adding a catch-all JSON error handler at the end of the middleware chain. Confirmed by attaching a rejected file type before the fix (raw HTML with a stack trace) and after (clean `{"message": "..."}"`).

One usability issue was also fixed: the student registration form had a "Current Semester" dropdown that was collected on the client but silently dropped by the server (new registrants always start at Semester 1 by design — a self-registration can't claim to already be mid-program). Selecting anything other than "Semester 1" there would have silently done nothing, which would have looked like a bug to a reviewer. The dropdown was removed from `frontend/pages/portal/student.js`; all other places that *display* the student's current semester (profile, dashboard, transcript) are unaffected since they read the real, server-side value.

Also fixed while auditing this workflow: HOD notice creation (`POST /api/portal/hod/notices`) wasn't writing an audit-log entry at all — every other mutating action across the portals was, but a posted notice was invisible in the Activity/Audit Trail. Added the missing `logAudit` call so Step 10 now shows up correctly in Step 12.

Every step above was performed against the running system (registration, approval, challan generation, payment, attendance, result-sheet submission and finalization, GPA/CGPA computation, notice posting, and the dashboard/audit views) and produced the "expected screen" described. The one thing not independently confirmed is pixel-level rendering in an actual browser window, since this verification ran through the same HTTP requests the browser makes rather than a browser itself — the UI's request payloads and field names were read directly from the current source (`frontend/pages/portal/*.js`) to keep every field name and label in this document in sync with the real forms.
