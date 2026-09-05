// Single source of truth for "how many weekly sessions does a course of N
// credit hours need" across the whole app (timetable auto-suggest, any future
// workload calculation). Never hard-code this rule anywhere else — read the
// policy via CreditHourPolicy (routes/hodPortal.js GET/PATCH
// /credit-hour-policies, or GET /api/lookups/credit-hour-policies) instead.
const CreditHourPolicy = require('../models/CreditHourPolicy');

// Returns [{ kind: 'theory'|'lab', durationMinutes }, ...] — one entry per
// individual weekly session (a policy's `count: 2` expands to two entries).
// Looks up a department-specific override first, then falls back to the
// university-wide default (departmentId: null); returns [] if neither exists
// yet (e.g. before scripts/seedCreditHourPolicies.js has been run) rather
// than throwing, so callers can surface "no policy configured" themselves.
async function requiredSessionsFor({ creditHours, isLab, departmentId }) {
  const cr = Number(creditHours);
  const lab = !!isLab;

  let policy = null;
  if (departmentId) {
    policy = await CreditHourPolicy.findOne({ departmentId, creditHours: cr, isLab: lab, isActive: true });
  }
  if (!policy) {
    policy = await CreditHourPolicy.findOne({ departmentId: null, creditHours: cr, isLab: lab, isActive: true });
  }
  if (!policy) return [];

  const expanded = [];
  for (const s of policy.sessions) {
    for (let i = 0; i < s.count; i++) {
      expanded.push({ kind: s.kind, durationMinutes: s.durationMinutes });
    }
  }
  return expanded;
}

module.exports = { requiredSessionsFor };
