// In-app + email notification dispatch — the single place anything in the
// app should go through to notify a user, so category/priority/dedupe/email
// behavior stays consistent everywhere instead of every feature reinventing it.
const Notification = require('../models/Notification');
const { sendNotificationEmail } = require('./mailer');

const RECIPIENT_MODEL = {
  student: () => require('../models/Student'),
  teacher: () => require('../models/Teacher'),
  hod:     () => require('../models/HOD'),
  exam:    () => require('../models/ExaminationStaff'),
  admin:   () => require('../models/Admin'),
  finance: () => require('../models/FinanceStaff'),
};

// Creates one notification and (unless email === false) emails the
// recipient. A duplicate dedupeKey is a silent no-op — never an error —
// so a cron job can call this once per candidate every run without
// tracking "did I already notify this person" itself.
//
// { recipientRole, recipient, category, title, body, link, entityType,
//   entityId, priority, dedupeKey, email }
async function notify({
  recipientRole, recipient, category, title, body = '', link = '',
  entityType = '', entityId = null, priority = 'normal', dedupeKey, email = true,
}) {
  if (dedupeKey) {
    const existing = await Notification.findOne({ dedupeKey });
    if (existing) return existing;
  }

  let doc;
  try {
    doc = await Notification.create({
      recipientRole, recipient, category, title, body, link,
      entityType, entityId, priority, dedupeKey,
    });
  } catch (err) {
    // A dedupeKey race (two callers creating the same key at once) lands
    // here as a duplicate-key error — treat it the same as "already exists".
    if (err.code === 11000 && dedupeKey) {
      const existing = await Notification.findOne({ dedupeKey });
      if (existing) return existing;
    }
    throw err;
  }

  if (email !== false) {
    try {
      const Model = RECIPIENT_MODEL[recipientRole]?.();
      const user = Model ? await Model.findById(recipient).select('email fullName') : null;
      if (user?.email) {
        await sendNotificationEmail(user.email, user.fullName || '', title, body, link);
        doc.emailSent = true;
        await doc.save();
      }
    } catch (err) {
      // Email failure must never break the request that triggered the
      // notification — record it on the notification and move on.
      doc.emailError = err.message || 'Failed to send notification email.';
      await doc.save().catch(() => {});
    }
  }

  return doc;
}

// Fires notify() for each item and tolerates individual failures — one bad
// recipient (e.g. a stale account) doesn't stop the rest of a batch (used by
// cron-style bulk notifications like a daily absence sweep).
async function notifyMany(items) {
  const results = await Promise.allSettled(items.map((item) => notify(item)));
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'notify failed', item: items[i] }));
}

module.exports = { notify, notifyMany };
