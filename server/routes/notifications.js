const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@queuewise.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// @route   GET /api/notifications/vapid-key
// @desc    Get public VAPID key for web push subscription
// @access  Public (or Private)
router.get('/vapid-key', (req, res) => {
  res.json({ vapidPublicKey: process.env.VAPID_PUBLIC_KEY });
});

// @route   POST /api/notifications/subscribe
// @desc    Save user's push subscription and send confirmation if explicitly requested
// @access  Private
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription, isUserAction, position, businessName } = req.body;
    if (!subscription) {
      return res.status(400).json({ message: 'Push subscription is required' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      pushSubscription: subscription
    });

    console.log(`Saved push subscription for user ${req.user.name} (${req.user._id})`);

    // Only send notification popup if explicitly triggered by clicking "Notify Me"
    if (isUserAction) {
      let title = "Push Alerts Activated! 🔔";
      let body = "You will receive automatic push notifications when you reach #2 in line.";

      if (position === 2) {
        title = "You're up soon! 🔔";
        body = `You are currently #2 in line at ${businessName || 'the venue'}. Please head towards the location!`;
      } else if (position === 1) {
        title = "You're #1 in line! 🏃";
        body = `You are next up at ${businessName || 'the venue'}. Get ready!`;
      }

      const payload = JSON.stringify({
        title,
        body,
        url: "/discover"
      });

      webpush.sendNotification(subscription, payload).catch(err => {
        console.error('Error sending confirmation push:', err.message);
      });
    }

    res.json({ message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ message: 'Server error saving push subscription' });
  }
});

module.exports = router;
