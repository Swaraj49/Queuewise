const express = require('express');
const QueueEntry = require('../models/QueueEntry');
const Business = require('../models/Business');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const { emitQueueUpdate, recalculatePositions, sendPushToUser } = require('../utils/queueHelpers');

// @route   POST /api/queue/join/:businessId
// @desc    Join a queue
// @access  Private
router.post('/join/:businessId', protect, async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const userId = req.user._id;
    const io = req.app.get('io');

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (!business.isAcceptingQueue) return res.status(400).json({ message: 'Business is not currently accepting new queue entries' });

    const existingEntry = await QueueEntry.findOne({ businessId, userId, status: 'waiting' });
    if (existingEntry) return res.status(400).json({ message: 'You are already waiting in this queue' });

    const waitingCount = await QueueEntry.countDocuments({ businessId, status: 'waiting' });

    const newEntry = await QueueEntry.create({
      businessId,
      userId,
      position: waitingCount + 1,
    });

    if (io) {
      io.to(userId.toString()).emit('yourPositionUpdated', {
        position: newEntry.position,
        estimatedWaitTimeMinutes: newEntry.position * business.avgServiceTimeMinutes
      });
    }

    await emitQueueUpdate(businessId, io);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/queue/leave/:businessId
// @desc    Leave a queue
// @access  Private
router.post('/leave/:businessId', protect, async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const userId = req.user._id;
    const io = req.app.get('io');

    const entry = await QueueEntry.findOne({ businessId, userId, status: 'waiting' });
    if (!entry) return res.status(404).json({ message: 'You are not currently waiting in this queue' });

    entry.status = 'no-show';
    entry.position = null;
    await entry.save();

    const business = await Business.findById(businessId);
    await recalculatePositions(businessId, io, business);
    await emitQueueUpdate(businessId, io);

    res.json({ message: 'Successfully left the queue' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/queue/status/:businessId
// @desc    Get user's current queue status
// @access  Private
router.get('/status/:businessId', protect, async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const userId = req.user._id;

    // Find if user is waiting, called, in-service OR completed
    let entry = await QueueEntry.findOne({ 
      businessId, 
      userId, 
      status: { $in: ['waiting', 'called', 'in-service'] } 
    });
    
    if (!entry) {
      // Find the most recent completed or no-show entry
      entry = await QueueEntry.findOne({ businessId, userId }).sort({ joinedAt: -1 });
    }

    if (!entry) return res.status(404).json({ message: 'You are not currently active in this queue' });

    const business = await Business.findById(businessId);
    
    if (entry.status === 'in-service' || entry.status === 'called' || entry.status === 'completed' || entry.status === 'no-show') {
      return res.json({
        entryId: entry._id,
        position: 0,
        estimatedWaitTimeMinutes: 0,
        joinedAt: entry.joinedAt,
        businessName: business.name,
        businessId: business._id,
        status: entry.status
      });
    }

    const estimatedWaitTimeMinutes = entry.position * business.avgServiceTimeMinutes;

    res.json({
      entryId: entry._id,
      position: entry.position,
      estimatedWaitTimeMinutes,
      joinedAt: entry.joinedAt,
      businessName: business.name,
      businessId: business._id,
      status: 'waiting'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/queue/list/:businessId
// @desc    Get full current queue for a business
// @access  Private (Owner only)
router.get('/list/:businessId', protect, authorize('owner'), async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You do not own this business' });

    const queueList = await QueueEntry.find({
      businessId,
      status: { $in: ['waiting', 'called', 'in-service'] },
    })
    .populate('userId', 'name email')
    .sort('status position joinedAt');

    res.json(queueList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/queue/next/:businessId
// @desc    Call next user in queue (mark current as completed, next as called)
// @access  Private (Owner only)
router.patch('/next/:businessId', protect, authorize('owner'), async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const io = req.app.get('io');

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You do not own this business' });

    // Mark current in-service user as completed (if any)
    const currentInService = await QueueEntry.findOne({ businessId, status: 'in-service' });
    if (currentInService) {
      currentInService.status = 'completed';
      
      if (currentInService.serviceStartedAt) {
        const serviceTimeMs = Date.now() - currentInService.serviceStartedAt.getTime();
        const serviceTimeMinutes = Math.round(serviceTimeMs / 60000);
        let newAvg = Math.round((business.avgServiceTimeMinutes * 0.8) + (serviceTimeMinutes * 0.2));
        business.avgServiceTimeMinutes = Math.max(1, newAvg);
        await business.save();
      }
      await currentInService.save();

      if (io) {
        io.to(currentInService.userId.toString()).emit('yourPositionUpdated', {
          position: null,
          estimatedWaitTimeMinutes: 0,
          status: 'completed',
          entryId: currentInService._id
        });
      }
    }

    // Call next waiting user
    const nextWaiting = await QueueEntry.findOne({ businessId, status: 'waiting' }).sort('position');
    if (nextWaiting) {
      nextWaiting.status = 'called';
      nextWaiting.position = null;
      nextWaiting.calledAt = Date.now();
      await nextWaiting.save();

      sendPushToUser(nextWaiting.userId, {
        title: "You've been called! 🏃",
        body: `Your turn has arrived at ${business.name}. Please head to the counter now!`,
        url: `/queue-status/${businessId}`
      });

      if (io) {
        io.to(nextWaiting.userId.toString()).emit('yourPositionUpdated', {
          position: 0,
          estimatedWaitTimeMinutes: 0,
          status: 'called'
        });
      }
    }

    // Recalculate remaining waiting users and emit updates
    await recalculatePositions(businessId, io, business);
    await emitQueueUpdate(businessId, io);

    res.json({ message: 'Next user called successfully', nextUser: nextWaiting });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/queue/current/:businessId
// @desc    Update status of current in-service/called user without advancing queue
// @access  Private (Owner only)
router.patch('/current/:businessId', protect, authorize('owner'), async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { action, revenue } = req.body; // 'arrived', 'completed' or 'no-show'
    const io = req.app.get('io');

    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You do not own this business' });

    // Handle 'arrived' for called users
    if (action === 'arrived') {
      const currentCalled = await QueueEntry.findOne({ businessId, status: 'called' });
      if (!currentCalled) return res.status(400).json({ message: 'No user currently called' });
      
      currentCalled.status = 'in-service';
      currentCalled.serviceStartedAt = Date.now();
      await currentCalled.save();
      
      if (io) {
        io.to(currentCalled.userId.toString()).emit('yourPositionUpdated', {
          position: null,
          estimatedWaitTimeMinutes: 0,
          status: 'in-service'
        });
      }
      await emitQueueUpdate(businessId, io);
      return res.json({ message: 'User marked as arrived' });
    }

    const currentInService = await QueueEntry.findOne({ businessId, status: { $in: ['in-service', 'called'] } });
    if (!currentInService) {
      return res.status(400).json({ message: 'No user currently active' });
    }

    if (action === 'completed') {
      currentInService.status = 'completed';
      if (revenue !== undefined) {
        currentInService.revenue = Number(revenue);
      }
      if (currentInService.serviceStartedAt) {
        const serviceTimeMs = Date.now() - currentInService.serviceStartedAt.getTime();
        const serviceTimeMinutes = Math.round(serviceTimeMs / 60000);
        let newAvg = Math.round((business.avgServiceTimeMinutes * 0.8) + (serviceTimeMinutes * 0.2));
        business.avgServiceTimeMinutes = Math.max(1, newAvg);
        await business.save();
      }
    } else if (action === 'no-show') {
      currentInService.status = 'no-show';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    await currentInService.save();

    if (io) {
      io.to(currentInService.userId.toString()).emit('yourPositionUpdated', {
        position: null,
        estimatedWaitTimeMinutes: 0,
        status: action
      });
    }

    await emitQueueUpdate(businessId, io);

    res.json({ message: `User marked as ${action}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/queue/settings/:businessId
// @desc    Update business queue settings, average service time, & operating hours
// @access  Private (Owner only)
router.patch('/settings/:businessId', protect, authorize('owner'), async (req, res) => {
  try {
    const { avgServiceTimeMinutes, isAcceptingQueue, openingTime, closingTime } = req.body;
    const io = req.app.get('io');
    const business = await Business.findById(req.params.businessId);
    
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    if (avgServiceTimeMinutes !== undefined) {
      business.avgServiceTimeMinutes = Math.max(1, parseInt(avgServiceTimeMinutes));
    }
    if (isAcceptingQueue !== undefined) {
      business.isAcceptingQueue = Boolean(isAcceptingQueue);
    }
    if (openingTime) {
      business.openingTime = openingTime;
    }
    if (closingTime) {
      business.closingTime = closingTime;
    }

    await business.save();
    
    // Instantly recalculate positions/wait times and broadcast to all users
    await recalculatePositions(business._id, io, business);
    await emitQueueUpdate(business._id, io);

    res.json(business);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/queue/priority/:entryId
// @desc    Mark a queue entry as priority
// @access  Private (Owner only)
router.patch('/priority/:entryId', protect, authorize('owner'), async (req, res) => {
  try {
    const { entryId } = req.params;
    const io = req.app.get('io');
    
    const entry = await QueueEntry.findById(entryId);
    if (!entry) return res.status(404).json({ message: 'Queue entry not found' });
    
    const business = await Business.findById(entry.businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (entry.status !== 'waiting') {
      return res.status(400).json({ message: 'Can only prioritize waiting entries' });
    }

    entry.priority = 'priority';
    await entry.save();
    
    // Instantly recalculate positions/wait times and broadcast to all users
    await recalculatePositions(business._id, io, business);
    await emitQueueUpdate(business._id, io);
    
    res.json({ message: 'Entry marked as priority' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
