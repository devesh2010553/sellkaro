const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const Inquiry = require('../models/Inquiry');
const Testimonial = require('../models/Testimonial');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// every route below requires a logged-in admin
router.use(requireAuth, requireAdmin);

// ---------- Dashboard ----------
router.get('/stats', async (req, res) => {
  try {
    const [pendingAds, approvedAds, pendingTestimonials, newInquiries, unreadFeedback, totalUsers] = await Promise.all([
      Ad.countDocuments({ status: 'pending' }),
      Ad.countDocuments({ status: 'approved' }),
      Testimonial.countDocuments({ status: 'pending' }),
      Inquiry.countDocuments({ status: 'new' }),
      Feedback.countDocuments({ status: 'unread' }),
      User.countDocuments()
    ]);
    res.json({ pendingAds, approvedAds, pendingTestimonials, newInquiries, unreadFeedback, totalUsers });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Could not load dashboard stats.' });
  }
});

// ---------- Ads moderation ----------
router.get('/ads', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const ads = await Ad.find({ status }).populate('seller', 'name email phone').sort({ createdAt: -1 });
    res.json({ ads });
  } catch (err) {
    console.error('Admin list ads error:', err);
    res.status(500).json({ error: 'Could not load listings.' });
  }
});

router.patch('/ads/:id/approve', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Listing not found.' });

    ad.status = 'approved';
    ad.approvedAt = new Date();
    ad.rejectionReason = '';
    await ad.save();

    res.json({ ad, message: 'Listing approved and is now live.' });
  } catch (err) {
    console.error('Approve ad error:', err);
    res.status(500).json({ error: 'Could not approve this listing.' });
  }
});

router.patch('/ads/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Listing not found.' });

    ad.status = 'rejected';
    ad.rejectionReason = reason || 'Did not meet listing guidelines.';
    await ad.save();

    res.json({ ad, message: 'Listing rejected.' });
  } catch (err) {
    console.error('Reject ad error:', err);
    res.status(500).json({ error: 'Could not reject this listing.' });
  }
});

router.patch('/ads/:id/remove', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Listing not found.' });
    ad.status = 'removed';
    await ad.save();
    res.json({ ad, message: 'Listing removed from the site.' });
  } catch (err) {
    console.error('Remove ad error:', err);
    res.status(500).json({ error: 'Could not remove this listing.' });
  }
});

// ---------- Inquiries (admin-mediated messaging) ----------
router.get('/inquiries', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const inquiries = await Inquiry.find(filter)
      .populate('ad', 'title slug price images')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ inquiries });
  } catch (err) {
    console.error('Admin list inquiries error:', err);
    res.status(500).json({ error: 'Could not load inquiries.' });
  }
});

router.get('/inquiries/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('ad', 'title slug price images')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone');
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json({ inquiry });
  } catch (err) {
    console.error('Admin get inquiry error:', err);
    res.status(500).json({ error: 'Could not load this inquiry.' });
  }
});

// Admin sends a message to buyer OR seller within a thread
router.post('/inquiries/:id/message', async (req, res) => {
  try {
    const { to, text } = req.body; // to: 'buyer' | 'seller'
    if (!['buyer', 'seller'].includes(to)) return res.status(400).json({ error: "Recipient must be 'buyer' or 'seller'." });
    if (!text || !text.trim()) return res.status(400).json({ error: 'Please write a message.' });

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });

    inquiry.thread.push({ sender: 'admin', recipient: to, text: text.trim() });
    inquiry.status = 'in_progress';
    await inquiry.save();

    res.json({ message: `Message sent to ${to}.` });
  } catch (err) {
    console.error('Admin send message error:', err);
    res.status(500).json({ error: 'Could not send message.' });
  }
});

router.patch('/inquiries/:id/close', async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
    inquiry.status = 'closed';
    await inquiry.save();
    res.json({ message: 'Conversation closed.' });
  } catch (err) {
    console.error('Close inquiry error:', err);
    res.status(500).json({ error: 'Could not close this conversation.' });
  }
});

// ---------- Testimonials moderation ----------
router.get('/testimonials', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const testimonials = await Testimonial.find({ status }).populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ testimonials });
  } catch (err) {
    console.error('Admin list testimonials error:', err);
    res.status(500).json({ error: 'Could not load testimonials.' });
  }
});

router.patch('/testimonials/:id/approve', async (req, res) => {
  try {
    const t = await Testimonial.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Testimonial not found.' });
    t.status = 'approved';
    await t.save();
    res.json({ testimonial: t, message: 'Testimonial approved and is now live.' });
  } catch (err) {
    console.error('Approve testimonial error:', err);
    res.status(500).json({ error: 'Could not approve this testimonial.' });
  }
});

router.patch('/testimonials/:id/reject', async (req, res) => {
  try {
    const t = await Testimonial.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Testimonial not found.' });
    t.status = 'rejected';
    await t.save();
    res.json({ testimonial: t, message: 'Testimonial rejected.' });
  } catch (err) {
    console.error('Reject testimonial error:', err);
    res.status(500).json({ error: 'Could not reject this testimonial.' });
  }
});

// ---------- Feedback ----------
router.get('/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json({ feedback });
  } catch (err) {
    console.error('Admin list feedback error:', err);
    res.status(500).json({ error: 'Could not load feedback.' });
  }
});

router.patch('/feedback/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['unread', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!fb) return res.status(404).json({ error: 'Feedback not found.' });
    res.json({ feedback: fb });
  } catch (err) {
    console.error('Update feedback status error:', err);
    res.status(500).json({ error: 'Could not update feedback.' });
  }
});

// ---------- Users ----------
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(200);
    res.json({ users });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Could not load users.' });
  }
});

router.patch('/users/:id/block', async (req, res) => {
  try {
    const { blocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: !!blocked }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ error: 'Could not update this user.' });
  }
});

module.exports = router;
