const express = require('express');
const { protect } = require('../middleware/auth');
const Review = require('../models/Review');
const QueueEntry = require('../models/QueueEntry');

const router = express.Router();

// @route   POST /api/reviews
// @desc    Submit a review for a completed queue visit
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { businessId, queueEntryId, rating, comment } = req.body;

    if (!businessId || !queueEntryId || !rating) {
      return res.status(400).json({ message: 'businessId, queueEntryId, and rating are required' });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
    }

    // Check if the queue entry exists, belongs to user, and is completed
    const queueEntry = await QueueEntry.findOne({
      _id: queueEntryId,
      userId: req.user._id,
      businessId,
      status: 'completed'
    });

    if (!queueEntry) {
      return res.status(400).json({ message: 'Only completed queue entries can be reviewed' });
    }

    // Check if a review already exists for this queue entry
    const existingReview = await Review.findOne({ queueEntryId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this visit' });
    }

    const review = await Review.create({
      businessId,
      userId: req.user._id,
      queueEntryId,
      rating: numericRating,
      comment: comment ? String(comment).trim() : ''
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Server error submitting review' });
  }
});

module.exports = router;
