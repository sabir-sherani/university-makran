# How to run these — copy & paste, one at a time

Open `university-website/` in VS Code, open the Claude Code agent, and paste the lines below **in order**.
Each file is self-contained: it already includes the project context, so you never paste the context separately.

**Start a fresh chat for each phase.** Do not run two phases in one chat.

---

### Paste 1

```
Read prompts/phase-1.md and do exactly what it says.
```

### Paste 2 — new chat, only after Phase 1's checklist passes

```
Read prompts/phase-2.md and do exactly what it says.
```

### Paste 3 — new chat

```
Read prompts/phase-3.md and do exactly what it says.
```

### Paste 4 — new chat

```
Read prompts/phase-4.md and do exactly what it says.
```

### Paste 5 — new chat

```
Read prompts/phase-5.md and do exactly what it says.
```

### Paste 6 — new chat

```
Read prompts/phase-6.md and do exactly what it says.
```

### Paste 7 — new chat, the final check

```
Read prompts/final-check.md and do exactly what it says.
```

---

## Two extra pastes you may need

**If the agent starts drifting or doing too much at once:**

```
Stop. Re-read the phase file you were given. Do only what that phase asks for, nothing from later phases.
```

**If it says it's finished but you're not sure:**

```
Run every item in the Acceptance Checklist at the bottom of the phase file and show me the actual result of each one — commands run and output, not a summary.
```

---

## What each phase does

| File | What you get after it |
|---|---|
| `phase-1.md` | Course catalogue, the 3CR/4CR credit-hour rules stored as data, notification system, department settings. Nothing visible yet — this is the foundation. |
| `phase-2.md` | The timetable: slots, room/teacher/class clash blocking, auto-suggested slots the HOD confirms, printable and downloadable timetable. |
| `phase-3.md` | Make-up class marking on attendance, and automatic absence alerts to students. |
| `phase-4.md` | Automatic reminders to faculty who haven't submitted documents, plus the notification bell in every portal. |
| `phase-5.md` | Students file attendance correction requests with supporting documents; only the HOD approves, and approval updates the real record. |
| `phase-6.md` | The full HOD portal sidebar (all 11 sections) and the monthly / semester / exam-eligibility reports. |
| `final-check.md` | Regression, authorization and normalization sweep across the whole system. |

The full uncut version of all of this is in `CLAUDE_CODE_PROMPT.md` in the project root, if you ever want to read it end to end.
