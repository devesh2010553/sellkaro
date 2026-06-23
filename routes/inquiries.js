const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Ad = require('../models/Ad');
const { requireAuth } = require('../middleware/auth');

/*
  IMPORTANT: This is the heart of the "no direct contact" requirement.
  - A buyer sends an inquiry about an ad -> it lands in Mongo, visible to admin only.
  - The seller is NEVER given the buyer's contact details directly.
  - Admin relays messages between buyer and seller manually via the thread.
  - Buyer and seller each only see admin's messages to THEM, never the other
    party's raw messages, enforced by filtering in the GET routes below.
*/

// Buyer: send an inquiry about an ad (must be logged in)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { adId, message } = req.body;
    if (!adId || !message || !message.trim()) {
      return res.status(400).json({ error: 'Please write a message before sending your inquiry.' });
    }

    const ad = await Ad.findOne({ _id: adId, status: 'approved' });
    if (!ad) return res.status(404).json({ error: 'This listing is not available.' });

    if (String(ad.seller) === String(req.user._id)) {
      return res.status(400).json({ error: "You can't send an inquiry about your own listing." });
    }

    const inquiry = await Inquiry.create({
      ad: ad._id,
      buyer: req.user._id,
      seller: ad.seller,
      initialMessage: message.trim(),
      thread: [],
      status: 'new'
    });

    res.status(201).json({
      inquiry,
      message: 'Your message has been sent to our team. We will reach out to the seller and get back to you shortly.'
    });
  } catch (err) {
    console.error('Create inquiry error:', err);
    res.status(500).json({ error: 'Could not send your inquiry. Please try again.' });
  }
});

// Buyer: view inquiries they've sent, with only admin's relayed replies visible
router.get('/mine/sent', requireAuth, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ buyer: req.user._id })
      .populate('ad', 'title slug images price')
      .sort({ createdAt: -1 });

    const filtered = inquiries.map(inq => ({
      _id: inq._id,
      ad: inq.ad,
      initialMessage: inq.initialMessage,
      status: inq.status,
      createdAt: inq.createdAt,
      // buyer only sees messages they sent, plus admin messages addressed to them
      thread: inq.thread.filter(m => m.sender === 'buyer' || (m.sender === 'admin' && m.recipient === 'buyer'))
    }));

    res.json({ inquiries: filtered });
  } catch (err) {
    console.error('Buyer inquiries error:', err);
    res.status(500).json({ error: 'Could not load your messages.' });
  }
});

// Seller: view inquiries received about their ads, only admin's relayed messages visible
router.get('/mine/received', requireAuth, async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ seller: req.user._id })
      .populate('ad', 'title slug images price')
      .sort({ createdAt: -1 });

    const filtered = inquiries.map(inq => ({
      _id: inq._id,
      ad: inq.ad,
      status: inq.status,
      createdAt: inq.createdAt,
      // seller never sees the buyer's raw initialMessage or buyer-tagged thread entries -
      // only their own replies plus admin messages addressed specifically to them
      thread: inq.thread.filter(m => m.sender === 'seller' || (m.sender === 'admin' && m.recipient === 'seller'))
    }));

    res.json({ inquiries: filtered });
  } catch (err) {
    console.error('Seller inquiries error:', err);
    res.status(500).json({ error: 'Could not load your messages.' });
  }
});

// Seller: reply to admin within a thread they're part of
router.post('/:id/seller-reply', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Please write a message.' });

    const inquiry = await Inquiry.findOne({ _id: req.params.id, seller: req.user._id });
    if (!inquiry) return res.status(404).json({ error: 'Conversation not found.' });

    inquiry.thread.push({ sender: 'seller', text: text.trim() });
    inquiry.status = 'in_progress';
    await inquiry.save();

    res.json({ message: 'Reply sent to our team.' });
  } catch (err) {
    console.error('Seller reply error:', err);
    res.status(500).json({ error: 'Could not send your reply.' });
  }
});

// Buyer: reply to admin within a thread they're part of
router.post('/:id/buyer-reply', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Please write a message.' });

    const inquiry = await Inquiry.findOne({ _id: req.params.id, buyer: req.user._id });
    if (!inquiry) return res.status(404).json({ error: 'Conversation not found.' });

    inquiry.thread.push({ sender: 'buyer', text: text.trim() });
    inquiry.status = 'in_progress';
    await inquiry.save();

    res.json({ message: 'Reply sent to our team.' });
  } catch (err) {
    console.error('Buyer reply error:', err);
    res.status(500).json({ error: 'Could not send your reply.' });
  }
});

module.exports = router;
