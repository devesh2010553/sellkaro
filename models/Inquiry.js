const mongoose = require('mongoose');

/*
  Inquiry flow (admin-mediated messaging):
  1. A logged-in buyer sends an inquiry about an ad. It is saved here and
     visible ONLY to admin - the seller is NOT notified directly and does
     NOT receive the buyer's contact info automatically.
  2. Admin reviews the inquiry in the admin panel and decides what to relay
     to the seller (via the messages thread below).
  3. Admin can message the seller, and separately relay information back
     to the buyer. Buyer and seller never see each other's contact details
     unless admin chooses to share it manually.
*/

const messageSchema = new mongoose.Schema({
  // who sent this message within the thread
  sender: {
    type: String,
    enum: ['admin', 'buyer', 'seller'],
    required: true
  },
  // when sender is 'admin', recipient tells us who it was meant for
  // ('buyer' or 'seller'). Not used when sender is 'buyer' or 'seller'
  // (those are always directed at admin).
  recipient: {
    type: String,
    enum: ['buyer', 'seller', null],
    default: null
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const inquirySchema = new mongoose.Schema({
  ad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
    index: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  initialMessage: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  // Full conversation thread - admin relays between buyer and seller manually.
  // Buyer-facing and seller-facing views of this thread are filtered by sender
  // role in the route layer so buyer and seller only see admin's relayed messages,
  // never each other's raw messages.
  thread: [messageSchema],
  status: {
    type: String,
    enum: ['new', 'in_progress', 'closed'],
    default: 'new',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Inquiry', inquirySchema);
