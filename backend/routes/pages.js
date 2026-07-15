const express = require('express');
const router = express.Router();

// About page content
router.get('/', (req, res) => {
  res.json({
    mission: 'Provide quality education and foster innovation in academics and research.',
    vision: 'Be a leading institution recognized for excellence in education and research.',
    history: 'University of Makran, Panjgur was established with the mission to provide quality higher education to students from the region. Over the years, it has grown to become a respected institution offering diverse academic programs and research opportunities.'
  });
});

module.exports = router;
