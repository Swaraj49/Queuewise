const mongoose = require('mongoose');

const queueEntrySchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['waiting', 'called', 'in-service', 'completed', 'no-show'],
    default: 'waiting',
  },
  priority: {
    type: String,
    enum: ['normal', 'priority'],
    default: 'normal',
  },
  position: {
    type: Number,
  },
  calledAt: {
    type: Date,
  },
  serviceStartedAt: {
    type: Date,
  },
  revenue: {
    type: Number,
    default: 0,
  }
});

module.exports = mongoose.model('QueueEntry', queueEntrySchema);
