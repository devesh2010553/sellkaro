const express = require('express');
const router = express.Router();
const Testimonial = require('../models/Testimonial');
const { requireAuth } = require('../middleware/auth');

// Public: list approved testimonials only
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(50);
    res.json({ testimonials });
  } catch (err) {
    console.error('List testimonials error:', err);
    res.status(500).json({ error: 'Could not load testimonials.' });
  }
});

// Auth required: submit a testimonial - starts as pending
router.post('/', requireAuth, async (req, res) => {
  try {
    const { rating, message } = req.body;
    if (!rating || !message || !message.trim()) {
      return res.status(400).json({ error: 'Please provide a rating and a message.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const testimonial = await Testimonial.create({
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      message: message.trim(),
      status: 'pending'
    });

    res.status(201).json({
      testimonial,
      message: 'Thanks! Your testimonial has been submitted and will appear on the site once approved.'
    });
  } catch (err) {
    console.error('Submit testimonial error:', err);
    res.status(500).json({ error: 'Could not submit your testimonial. Please try again.' });
  }
});

module.exports = router;
