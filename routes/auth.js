const express = require('express');
const router = express.Router();
const admin = require('../config/firebase');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

/*
  Signup flow:
  1. Frontend creates the user in Firebase (email + password) using the
     Firebase JS SDK, then calls sendEmailVerification().
  2. Frontend calls this endpoint with the Firebase ID token + name + phone
     to create the matching record in MongoDB.
  3. User cannot publish ads until emailVerified is true (checked live
     against Firebase on each protected request, not just at signup).
*/
router.post('/sync', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const { name, phone } = req.body;

    if (!token) return res.status(401).json({ error: 'Missing auth token.' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required.' });

    const decoded = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decoded.uid });

    if (user) {
      // Already exists - just refresh verification status and return it
      user.emailVerified = !!decoded.email_verified;
      await user.save();
      return res.json({ user });
    }

    user = await User.create({
      firebaseUid: decoded.uid,
      name: name.trim(),
      email: decoded.email,
      phone: phone.trim(),
      emailVerified: !!decoded.email_verified
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error('Signup sync error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: 'Could not complete signup. Please try again.' });
  }
});

// Refresh emailVerified status (call after user clicks the verification link)
router.post('/refresh-verification', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
