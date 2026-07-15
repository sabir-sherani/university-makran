const express = require('express');
const router  = express.Router();

const News             = require('../models/News');
const Department       = require('../models/Department');
const AdministrationDept = require('../models/AdministrationDept');
const Program          = require('../models/Program');
const Faculty          = require('../models/Faculty');
const Facility         = require('../models/Facility');

// Sanitise input so it is safe to embed in a RegExp
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a case-insensitive partial-match regex from the query string
function rx(q) {
  return new RegExp(escapeRegex(q), 'i');
}

// Trim a long string to a readable snippet
function snippet(text, maxLen = 140) {
  if (!text) return '';
  // Strip HTML tags (rich-text fields store HTML)
  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length <= maxLen ? plain : plain.slice(0, maxLen).trimEnd() + '…';
}

// ── GET /api/search?q=...&category=all&limit=30 ───────────────────────────────
router.get('/', async (req, res) => {
  const q        = (req.query.q || '').trim();
  const category = (req.query.category || 'all').toLowerCase();
  const perCat   = Math.min(parseInt(req.query.limit) || 30, 50);

  if (q.length < 2) return res.json({ query: q, total: 0, results: [] });

  const pattern = rx(q);
  const results = [];

  try {
    await Promise.all([

      // ── NEWS ──────────────────────────────────────────────────────────────
      (category === 'all' || category === 'news') && (async () => {
        const items = await News.find({
          published: true,
          $or: [
            { title:       pattern },
            { description: pattern },
          ],
        }).select('title description date linkType linkUrl document').limit(perCat).lean();

        items.forEach(item => results.push({
          id:          item._id,
          title:       item.title,
          description: snippet(item.description),
          category:    'News',
          categoryColor: '#40021A',
          url:         '/news',
          meta:        new Date(item.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }),
        }));
      })(),

      // ── ACADEMIC DEPARTMENTS ──────────────────────────────────────────────
      (category === 'all' || category === 'departments') && (async () => {
        const items = await Department.find({
          $or: [
            { name:        pattern },
            { description: pattern },
            { 'hod.name':  pattern },
          ],
        }).select('name slug description hod bannerImage').limit(perCat).lean();

        items.forEach(item => results.push({
          id:          item._id,
          title:       item.name,
          description: snippet(item.description) || (item.hod?.name ? `HOD: ${item.hod.name}` : ''),
          category:    'Department',
          categoryColor: '#21318A',
          url:         item.slug ? `/departments/${item.slug}` : '/departments',
          image:       item.bannerImage || null,
        }));
      })(),

      // ── ADMINISTRATION DEPARTMENTS ────────────────────────────────────────
      (category === 'all' || category === 'administration') && (async () => {
        const items = await AdministrationDept.find({
          $or: [
            { name:             pattern },
            { about:            pattern },
            { 'hod.name':       pattern },
            { 'hod.specialization': pattern },
            { 'staff.name':     pattern },
            { 'staff.jobTitle': pattern },
            { 'staff.education':pattern },
          ],
        }).select('name slug about hod staff').limit(perCat).lean();

        items.forEach(item => {
          // Check if the match was on a staff member → surface that member's name
          let matchedStaff = null;
          if (item.staff?.length) {
            matchedStaff = item.staff.find(m =>
              pattern.test(m.name) || pattern.test(m.jobTitle) || pattern.test(m.education)
            );
          }

          const desc = matchedStaff
            ? `${matchedStaff.name}${matchedStaff.jobTitle ? ` — ${matchedStaff.jobTitle}` : ''}`
            : snippet(item.about) || (item.hod?.name ? `HOD: ${item.hod.name}` : '');

          results.push({
            id:          item._id,
            title:       matchedStaff ? `${item.name} — ${matchedStaff.name}` : item.name,
            description: desc,
            category:    matchedStaff ? 'Staff' : 'Administration',
            categoryColor: matchedStaff ? '#065f46' : '#1d4ed8',
            url:         item.slug ? `/administration/${item.slug}` : '/administration',
          });
        });
      })(),

      // ── PROGRAMS ──────────────────────────────────────────────────────────
      (category === 'all' || category === 'programs') && (async () => {
        const items = await Program.find({
          $or: [
            { title:          pattern },
            { description:    pattern },
            { specialization: pattern },
            { category:       pattern },
          ],
        }).select('title description level duration specialization').limit(perCat).lean();

        items.forEach(item => results.push({
          id:          item._id,
          title:       item.title || item.category,
          description: snippet(item.description) || (item.specialization?.length ? item.specialization.join(', ') : ''),
          category:    'Program',
          categoryColor: '#b45309',
          url:         '/programs',
          meta:        [item.level, item.duration].filter(Boolean).join(' · '),
        }));
      })(),

      // ── FACULTY ───────────────────────────────────────────────────────────
      (category === 'all' || category === 'faculty') && (async () => {
        const items = await Faculty.find({
          $or: [
            { name:        pattern },
            { designation: pattern },
          ],
        }).populate('department', 'name slug').select('name designation photo department').limit(perCat).lean();

        items.forEach(item => results.push({
          id:          item._id,
          title:       item.name,
          description: item.designation || '',
          category:    'Faculty',
          categoryColor: '#7c3aed',
          url:         item.department?.slug ? `/departments/${item.department.slug}` : '/departments',
          meta:        item.department?.name || '',
          image:       item.photo || null,
        }));
      })(),

      // ── FACILITIES ────────────────────────────────────────────────────────
      (category === 'all' || category === 'facilities') && (async () => {
        const items = await Facility.find({
          $or: [
            { name:        pattern },
            { description: pattern },
            { features:    pattern },
          ],
        }).select('name description features').limit(perCat).lean();

        items.forEach(item => results.push({
          id:          item._id,
          title:       item.name,
          description: snippet(item.description) || (item.features?.length ? item.features.slice(0,4).join(', ') : ''),
          category:    'Facility',
          categoryColor: '#0891b2',
          url:         '/facilities',
        }));
      })(),

    ].filter(Boolean));

    // Sort: exact title matches first, then by category order
    const categoryOrder = { News:1, Department:2, Administration:3, Staff:4, Program:5, Faculty:6, Facility:7 };
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === q.toLowerCase() ? 0 : 1;
      const bExact = b.title.toLowerCase() === q.toLowerCase() ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return (categoryOrder[a.category] || 9) - (categoryOrder[b.category] || 9);
    });

    res.json({ query: q, total: results.length, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
