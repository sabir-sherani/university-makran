const AuditLog = require('../models/AuditLog');

const SENSITIVE_KEYS = ['password', 'twoFactorSecret', 'recoveryCodes', 'resetToken', 'resetTokenExpiry'];

// Strips secrets out of a before/after snapshot before it's persisted —
// audit entries must never contain password hashes or reset tokens.
function sanitize(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of SENSITIVE_KEYS) delete out[key];
  return out;
}

// Best-effort human-readable identifier for whoever is making the request,
// since each role's JWT payload carries a different id-ish field.
function actorNameFromUser(user) {
  if (!user) return '';
  return user.email || user.registrationNo || user.teacherId || user.hodId
    || user.examId || user.financeId || user.empId || String(user.id || '');
}

// Records one audit entry. Never throws — a logging failure must not break
// the mutating request that triggered it — so call sites can fire this
// without wrapping it in their own try/catch.
async function logAudit(req, { action, entityType, entityId, entityLabel, before, after }) {
  try {
    await AuditLog.create({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || 'system',
      actorName: actorNameFromUser(req.user),
      action,
      entityType,
      entityId: entityId || undefined,
      entityLabel: entityLabel || '',
      before: sanitize(before),
      after: sanitize(after),
      ip: req.ip || '',
      userAgent: req.headers?.['user-agent'] || '',
    });
  } catch (err) {
    console.error('[audit] failed to record log:', err.message);
  }
}

module.exports = { logAudit, sanitize };
