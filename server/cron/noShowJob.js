const cron = require('node-cron');
const QueueEntry = require('../models/QueueEntry');
const Business = require('../models/Business');
const { emitQueueUpdate, recalculatePositions } = require('../utils/queueHelpers');

const setupCron = (io) => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const timeoutMinutes = parseInt(process.env.NO_SHOW_TIMEOUT_MINUTES) || 5;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const cutoffTime = new Date(Date.now() - timeoutMs);

      // Find entries that have been called longer than the timeout
      const expiredEntries = await QueueEntry.find({
        status: 'called',
        calledAt: { $lt: cutoffTime }
      });

      if (expiredEntries.length === 0) return;

      console.log(`Cron: Found ${expiredEntries.length} expired called entries. Marking as no-show.`);

      for (const entry of expiredEntries) {
        // Mark as no-show
        entry.status = 'no-show';
        await entry.save();

        const business = await Business.findById(entry.businessId);
        if (!business) continue;

        // Emit to the affected user that they were marked as no-show
        if (io) {
          io.to(entry.userId.toString()).emit('yourPositionUpdated', {
            position: null,
            estimatedWaitTimeMinutes: 0,
            status: 'no-show'
          });
        }

        // Call the next waiting user for this specific business
        const nextWaiting = await QueueEntry.findOne({ businessId: business._id, status: 'waiting' }).sort('position');
        if (nextWaiting) {
          nextWaiting.status = 'called';
          nextWaiting.position = null;
          nextWaiting.calledAt = Date.now();
          await nextWaiting.save();

          if (io) {
            io.to(nextWaiting.userId.toString()).emit('yourPositionUpdated', {
              position: 0,
              estimatedWaitTimeMinutes: 0,
              status: 'called'
            });
          }
        }

        // Recalculate positions for the remaining queue and emit business updates
        await recalculatePositions(business._id, io, business);
        await emitQueueUpdate(business._id, io);
      }
    } catch (error) {
      console.error('Error in no-show cron job:', error);
    }
  });
};

module.exports = setupCron;
