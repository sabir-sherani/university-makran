const express = require('express');
const router  = express.Router();
const Contact = require('../models/Contact');

// GET /api/contact — all messages, newest first
router.get('/', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.sendServerError(err);
  }
});

// GET /api/contact/unread-count — for notification badge
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Contact.countDocuments({ read: false });
    res.json({ count });
  } catch (err) {
    res.sendServerError(err);
  }
});

// POST /api/contact — submit from contact form
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Name, email, subject and message are required.' });
  }
  try {
    const contact = new Contact(req.body);
    const saved   = await contact.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/contact/mark-all-read  ← must be BEFORE /:id
router.put('/mark-all-read', async (req, res) => {
  try {
    await Contact.updateMany({ read: false }, { read: true });
    res.json({ message: 'All messages marked as read' });
  } catch (err) {
    res.sendServerError(err);
  }
});

// PUT /api/contact/:id — mark read/unread or update status
router.put('/:id', async (req, res) => {
  try {
    const msg = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/contact/:id
router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    res.sendServerError(err);
  }
});

module.exports = router;
