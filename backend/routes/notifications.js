// Shared notification inbox for every portal role — see utils/notify.js for
// how notifications get created; this router only ever reads/updates a
// caller's own notifications, hard-filtered by {recipientRole, recipient}
// straight off the verified JWT, never a client-supplied id.
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Notification = require('../models/Notification');
const { verifyAnyRole } = require('../middleware/auth');

// Matches models/Notification.js's recipientRole enum — the roles that can
// actually receive a notification (employee isn't in that enum yet).
const verifyNotifiable = verifyAnyRole(['student', 'teacher', 'hod', 'exam', 'admin', 'finance']);

function ownerFilter(req) {
  return { recipientRole: req.user.role, recipient: req.user.id };
}

// GET /api/notifications?unreadOnly=true&category=&page=&limit=
router.get('/', verifyNotifiable, async (req, res) => {
  try {
    const filter = ownerFilter(req);
    if (req.query.unreadOnly === 'true') filter.isRead = false;
    if (req.query.category) filter.category = req.query.category;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [data, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    res.json({ data, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) { res.sendServerError(err); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyNotifiable, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ ...ownerFilter(req), isRead: false });
    res.json({ count });
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', verifyNotifiable, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification id.' });
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...ownerFilter(req) },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );
    if (!n) return res.status(404).json({ message: 'Notification not found.' });
    res.json(n);
  } catch (err) { res.sendServerError(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', verifyNotifiable, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { ...ownerFilter(req), isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    res.json({ message: 'All notifications marked as read.', modified: result.modifiedCount });
  } catch (err) { res.sendServerError(err); }
});

// DELETE /api/notifications/:id
router.delete('/:id', verifyNotifiable, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification id.' });
    const n = await Notification.findOneAndDelete({ _id: req.params.id, ...ownerFilter(req) });
    if (!n) return res.status(404).json({ message: 'Notification not found.' });
    res.json({ message: 'Notification deleted.' });
  } catch (err) { res.sendServerError(err); }
});

module.exports = router;
