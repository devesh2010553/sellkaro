const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Cars', 'Bikes', 'Mobiles', 'Electronics', 'Furniture', 'Property', 'Jobs', 'Other'],
    default: 'Cars',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // Car-specific optional fields (used when category === 'Cars')
  carDetails: {
    brand: String,
    model: String,
    year: Number,
    fuelType: { type: String, enum: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', ''] },
    transmission: { type: String, enum: ['Manual', 'Automatic', ''] },
    kmDriven: Number,
    owners: Number
  },
  images: [{
    url: String,
    publicId: String
  }],
  location: {
    city: { type: String, trim: true },
    state: { type: String, trim: true }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sold', 'removed'],
    default: 'pending',
    index: true
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  commissionPercent: {
    type: Number,
    default: 5
  },
  views: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  soldAt: Date
});

adSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Ad', adSchema);
