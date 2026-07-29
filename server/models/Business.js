const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  avgServiceTimeMinutes: {
    type: Number,
    default: 10,
  },
  isAcceptingQueue: {
    type: Boolean,
    default: true,
  },
  images: [{
    type: String,
  }],
  openingTime: {
    type: String,
    default: '09:00',
  },
  closingTime: {
    type: String,
    default: '18:00',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create 2dsphere index on location for geospatial queries
businessSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Business', businessSchema);
