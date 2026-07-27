const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Gallery = require('../models/Gallery');
const { createStorage } = require('../utils/cloudinary');

const upload = multer({ storage: createStorage('gallery', ['jpg', 'jpeg', 'png', 'webp', 'gif']) });

// GET /api/gallery — all published items sorted by order then date
router.get('/', async (req, res) => {
  try {
    const items = await Gallery.find({ published: true }).sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/gallery/all — all items (admin)
router.get('/all', async (req, res) => {
  try {
    const items = await Gallery.find().sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function handleUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ message: 'Image is too large. Maximum allowed size is 1 MB.' });
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}

function handleBulkUpload(req, res, next) {
  upload.array('images', 50)(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ message: 'One or more images exceed the 1 MB limit.' });
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}

// POST /api/gallery/bulk
router.post('/bulk', handleBulkUpload, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'No images provided.' });

    const category  = req.body.category  || 'General';
    const published = req.body.published !== 'false';
    const month     = req.body.month  ? Number(req.body.month)  : null;
    const year      = req.body.year   ? Number(req.body.year)   : null;
    const program   = req.body.program || '';

    const docs = req.files.map(file => ({
      title: '',
      description: '',
      category,
      image:    file.path,
      order:    0,
      published,
      month,
      year,
      program,
    }));

    const saved = await Gallery.insertMany(docs);
    res.status(201).json({ count: saved.length, items: saved });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/gallery
router.post('/', handleUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image is required' });
    const item = await new Gallery({
      title:       req.body.title       || '',
      description: req.body.description || '',
      category:    req.body.category    || 'General',
      image:       req.file.path,
      order:       Number(req.body.order) || 0,
      published:   req.body.published !== 'false',
      month:       req.body.month  ? Number(req.body.month)  : null,
      year:        req.body.year   ? Number(req.body.year)   : null,
      program:     req.body.program || '',
    }).save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/gallery/reorder — bulk order update [{id, order}, ...]
router.put('/reorder', async (req, res) => {
  try {
    const updates = req.body; // array of { id, order }
    if (!Array.isArray(updates)) return res.status(400).json({ message: 'Expected array' });
    await Promise.all(updates.map(({ id, order }) =>
      Gallery.findByIdAndUpdate(id, { order })
    ));
    res.json({ message: 'Order saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/gallery/:id
router.put('/:id', handleUpload, async (req, res) => {
  try {
    const existing = await Gallery.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const data = {
      title:       req.body.title       !== undefined ? req.body.title       : existing.title,
      description: req.body.description !== undefined ? req.body.description : existing.description,
      category:    req.body.category    || existing.category,
      order:       req.body.order       !== undefined ? Number(req.body.order) : existing.order,
      published:   req.body.published   !== undefined ? req.body.published !== 'false' : existing.published,
      month:       req.body.month  !== undefined ? (req.body.month  ? Number(req.body.month)  : null) : existing.month,
      year:        req.body.year   !== undefined ? (req.body.year   ? Number(req.body.year)   : null) : existing.year,
      program:     req.body.program !== undefined ? req.body.program : existing.program,
      image:       existing.image,
    };

    if (req.file) {
      const oldPath = path.join(__dirname, '../public', existing.image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      data.image = req.file.path;
    }

    const updated = await Gallery.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/gallery/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    const imgPath = path.join(__dirname, '../public', item.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
