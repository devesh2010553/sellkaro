const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    trim: true,
    default: 'Anonymous'
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['Bug', 'Suggestion', 'Complaint', 'Praise', 'Other'],
    default: 'Other'
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'resolved'],
    default: 'unread'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
