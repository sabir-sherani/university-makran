const express = require('express');
const router = require('express').Router();
const multer = require('multer');
const News = require('../models/News');
const { createStorage } = require('../utils/cloudinary');

const upload = multer({ storage: createStorage('news') });

// GET /api/news — all published news sorted by date desc
router.get('/', async (req, res) => {
  try {
    const news = await News.find({ published: true }).sort({ date: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/news/hero — featured items for the hero Latest Updates card (max 5)
router.get('/hero', async (req, res) => {
  try {
    const news = await News.find({ published: true, featuredInHero: true }).sort({ date: -1 }).limit(5);
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/news/all — all news (admin use, including unpublished)
router.get('/all', async (req, res) => {
  try {
    const news = await News.find().sort({ date: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'News item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/news
router.post('/', upload.fields([{ name: 'document', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
  try {
    const data = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date || Date.now(),
      linkType: req.body.linkType || 'external',
      linkUrl: req.body.linkUrl || '',
      published:      req.body.published !== 'false',
      featuredInHero: req.body.featuredInHero === 'true',
    };
    if (req.files?.document?.[0]) {
      data.document = req.files.document[0].path;
      data.linkType = 'document';
    }
    if (req.files?.image?.[0]) data.image = req.files.image[0].path;
    const saved = await new News(data).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/news/:id
router.put('/:id', upload.fields([{ name: 'document', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
  try {
    const existing = await News.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'News item not found' });

    const data = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date || existing.date,
      linkType: req.body.linkType || existing.linkType,
      linkUrl: req.body.linkUrl !== undefined ? req.body.linkUrl : existing.linkUrl,
      published:      req.body.published !== undefined ? req.body.published !== 'false' : existing.published,
      featuredInHero: req.body.featuredInHero !== undefined ? req.body.featuredInHero === 'true' : existing.featuredInHero,
      document: existing.document,
      image: existing.image,
    };
    if (req.files?.document?.[0]) {
      data.document = req.files.document[0].path;
      data.linkType = 'document';
    }
    if (req.files?.image?.[0]) data.image = req.files.image[0].path;
    const updated = await News.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/news/:id
router.delete('/:id', async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ message: 'News item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
