const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// Public: anyone can submit feedback, logged in or not
router.post('/', async (req, res) => {
  try {
    const { name, email, type, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Please write your feedback before submitting.' });
    }

    const feedback = await Feedback.create({
      name: name && name.trim() ? name.trim() : 'Anonymous',
      email: email ? email.trim() : '',
      type: type || 'Other',
      message: message.trim()
    });

    res.status(201).json({ feedback, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Submit feedback error:', err);
    res.status(500).json({ error: 'Could not submit your feedback. Please try again.' });
  }
});

module.exports = router;
