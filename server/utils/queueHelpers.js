const QueueEntry = require('../models/QueueEntry');
const User = require('../models/User');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@queuewise.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Helper function to emit full queue updates to a business room
const emitQueueUpdate = async (businessId, io) => {
  if (!io) return;
  try {
    const queueList = await QueueEntry.find({
      businessId,
      status: { $in: ['waiting', 'called', 'in-service'] },
    })
    .populate('userId', 'name email')
    .sort('status position joinedAt');
    
    io.to(businessId.toString()).emit('queueUpdated', queueList);
  } catch (error) {
    console.error('Error emitting queue update:', error);
  }
};

// Helper function to recalculate positions for a business's queue
const recalculatePositions = async (businessId, io, business) => {
  const waitingEntries = await QueueEntry.find({
    businessId,
    status: 'waiting',
  }).sort('joinedAt');

  // Separate into priority and normal queues
  const priorityQueue = waitingEntries.filter(entry => entry.priority === 'priority');
  const normalQueue = waitingEntries.filter(entry => entry.priority !== 'priority');

  const finalQueue = [];
  
  // Interleave logic: max 1 priority for every 5 normal
  while (priorityQueue.length > 0 || normalQueue.length > 0) {
    if (priorityQueue.length > 0) {
      finalQueue.push(priorityQueue.shift());
    }
    
    let count = 0;
    while (normalQueue.length > 0 && count < 5) {
      finalQueue.push(normalQueue.shift());
      count++;
    }
  }

  for (let i = 0; i < finalQueue.length; i++) {
    const entry = finalQueue[i];
    const newPosition = i + 1;
    const oldPosition = entry.position;
    entry.position = newPosition;
    await entry.save();
    
    // Trigger Web Push Notification if user reaches position #2 (or position #1)
    if ((newPosition === 2 || newPosition === 1) && oldPosition > newPosition) {
      try {
        const user = await User.findById(entry.userId);
        if (user && user.pushSubscription) {
          console.log(`Sending Web Push to user ${user.name} for position #${newPosition}`);
          const payload = JSON.stringify({
            title: newPosition === 2 ? "You're up soon!" : "You're #1 in line!",
            body: `You are #${newPosition} in line at ${business ? business.name : 'the counter'}. Please head towards the location!`,
            url: `/queue-status/${businessId}`
          });
          webpush.sendNotification(user.pushSubscription, payload).catch(err => {
            console.error('Web push error:', err.message);
          });
        } else {
          console.log(`User ${entry.userId} has no push subscription registered.`);
        }
      } catch (err) {
        console.error('Error triggering web push:', err);
      }
    }

    if (io && business) {
      io.to(entry.userId.toString()).emit('yourPositionUpdated', {
        position: entry.position,
        estimatedWaitTimeMinutes: entry.position * business.avgServiceTimeMinutes,
        status: 'waiting'
      });
    }
  }
};

const sendPushToUser = async (userId, payloadObj) => {
  try {
    const user = await User.findById(userId);
    if (user && user.pushSubscription) {
      console.log(`Sending Web Push to ${user.name}: ${payloadObj.title}`);
      await webpush.sendNotification(user.pushSubscription, JSON.stringify(payloadObj));
    }
  } catch (err) {
    console.error('sendPushToUser error:', err.message);
  }
};

module.exports = {
  emitQueueUpdate,
  recalculatePositions,
  sendPushToUser
};
