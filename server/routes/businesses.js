const express = require('express');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const QueueEntry = require('../models/QueueEntry');
const Review = require('../models/Review');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryConfig');

const router = express.Router();

// @route   POST /api/businesses
// @desc    Create a new business
// @access  Private (Owner only)
router.post('/', protect, authorize('owner'), async (req, res) => {
  try {
    const { name, category, lng, lat, avgServiceTimeMinutes } = req.body;

    if (!name || !category || lng === undefined || lat === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields (name, category, lng, lat)' });
    }

    const business = await Business.create({
      ownerId: req.user._id,
      name,
      category,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      avgServiceTimeMinutes: avgServiceTimeMinutes || 10,
    });

    res.status(201).json(business);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/businesses/nearby
// @desc    Get nearby businesses using geospatial query
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lng, lat, category, maxDistance, sortBy } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: 'Longitude (lng) and Latitude (lat) are required' });
    }

    const distanceLimit = maxDistance ? parseInt(maxDistance) : 10000; // default 10km

    // Create match query for optional category filter
    const matchQuery = category ? { category } : {};

    const sortStage = sortBy === 'rating' 
      ? { $sort: { avgRating: -1, calculatedDistance: 1 } }
      : { $sort: { calculatedDistance: 1 } };

    // Use aggregate $geoNear to get distance calculated
    const businesses = await Business.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: 'calculatedDistance', // Adds this field to the output document
          maxDistance: distanceLimit,
          spherical: true,
          query: matchQuery,
        },
      },
      {
        $lookup: {
          from: 'queueentries', // Mongoose pluralizes model QueueEntry -> queueentries
          let: { businessId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$businessId', '$$businessId'] },
                    { $eq: ['$status', 'waiting'] }
                  ]
                }
              }
            }
          ],
          as: 'waitingQueue'
        }
      },
      {
        $lookup: {
          from: 'reviews', // Mongoose pluralizes model Review -> reviews
          localField: '_id',
          foreignField: 'businessId',
          as: 'allReviews'
        }
      },
      {
        $addFields: {
          queueLength: { $size: '$waitingQueue' },
          avgRating: {
            $cond: [
              { $gt: [{ $size: '$allReviews' }, 0] },
              { $round: [{ $avg: '$allReviews.rating' }, 1] },
              0
            ]
          },
          reviewCount: { $size: '$allReviews' }
        }
      },
      {
        $project: {
          waitingQueue: 0,
          allReviews: 0
        }
      },
      sortStage
    ]);

    res.json(businesses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/businesses/me
// @desc    Get logged in owner's business
// @access  Private (Owner only)
router.get('/me', protect, authorize('owner'), async (req, res) => {
  try {
    const business = await Business.findOne({ ownerId: req.user._id });
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.json(business);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/businesses/:id
// @desc    Get single business by ID with queue stats and average rating
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const businessId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(404).json({ message: 'Invalid business ID' });
    }

    const business = await Business.findById(businessId).lean();

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Aggregate queue length and ratings
    const queueLength = await QueueEntry.countDocuments({ businessId, status: 'waiting' });
    
    const ratingAgg = await Review.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      { 
        $group: { 
          _id: '$businessId', 
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 } 
        } 
      }
    ]);

    const avgRating = ratingAgg.length > 0 ? parseFloat(ratingAgg[0].avgRating.toFixed(1)) : 0;
    const reviewCount = ratingAgg.length > 0 ? ratingAgg[0].reviewCount : 0;

    res.json({
      ...business,
      queueLength,
      avgRating,
      reviewCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/businesses/:id/analytics
// @desc    Get analytics for a business
// @access  Private (Owner only)
router.get('/:id/analytics', protect, authorize('owner'), async (req, res) => {
  try {
    const businessId = new mongoose.Types.ObjectId(req.params.id);
    const business = await Business.findById(businessId);
    
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this business' });
    }

    // 1. Average wait time by hour of day (in minutes)
    // 2. Peak hours (count of entries by hour)
    // 3. Revenue by hour
    const hourlyData = await QueueEntry.aggregate([
      { 
        $match: { 
          businessId,
          status: { $in: ['in-service', 'completed', 'no-show', 'called'] }
        } 
      },
      {
        $project: {
          hourOfDay: { $hour: "$joinedAt" },
          revenue: { $ifNull: ["$revenue", 0] },
          waitTimeMs: {
            $subtract: [
              { $ifNull: ["$calledAt", { $ifNull: ["$serviceStartedAt", "$joinedAt"] }] },
              "$joinedAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: "$hourOfDay",
          avgWaitTimeMs: { $avg: "$waitTimeMs" },
          entryCount: { $sum: 1 },
          totalRevenue: { $sum: "$revenue" }
        }
      },
      {
        $project: {
          hour: "$_id",
          avgWaitTimeMinutes: { $round: [{ $divide: ["$avgWaitTimeMs", 60000] }, 1] },
          count: "$entryCount",
          revenue: "$totalRevenue",
          _id: 0
        }
      },
      { $sort: { hour: 1 } }
    ]);

    // 4. No-show rate
    const noShowStats = await QueueEntry.aggregate([
      { 
        $match: { 
          businessId,
          status: { $in: ['completed', 'no-show'] }
        } 
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          noShowCount: {
            $sum: { $cond: [{ $eq: ["$status", "no-show"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          rate: {
            $multiply: [
              { $divide: ["$noShowCount", "$totalCount"] },
              100
            ]
          },
          _id: 0
        }
      }
    ]);
    const noShowRate = noShowStats.length > 0 ? Math.round(noShowStats[0].rate) : 0;

    // 5. Total customers served this week and total revenue this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyStats = await QueueEntry.aggregate([
      {
        $match: {
          businessId,
          status: 'completed',
          serviceStartedAt: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: null,
          servedThisWeek: { $sum: 1 },
          totalRevenueThisWeek: { $sum: { $ifNull: ["$revenue", 0] } }
        }
      }
    ]);

    const servedThisWeek = weeklyStats.length > 0 ? weeklyStats[0].servedThisWeek : 0;
    const totalRevenueThisWeek = weeklyStats.length > 0 ? weeklyStats[0].totalRevenueThisWeek : 0;

    res.json({
      hourlyData,
      noShowRate,
      servedThisWeek,
      totalRevenueThisWeek
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/businesses/:id/qr-data
// @desc    Get QR code payload data for business counter
// @access  Private (Owner only)
router.get('/:id/qr-data', protect, authorize('owner'), async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this business' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const joinUrl = `${clientUrl}/join/${business._id}`;

    res.json({
      businessId: business._id,
      businessName: business.name,
      joinUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/businesses/:id/reviews
// @desc    Get paginated reviews for a business
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const businessId = req.params.id;

    const total = await Review.countDocuments({ businessId });
    const reviews = await Review.find({ businessId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// @route   POST /api/businesses/:id/upload-image
// @desc    Upload storefront photo to Cloudinary (Max 5 per business)
// @access  Private (Owner only)
router.post('/:id/upload-image', protect, authorize('owner'), upload.single('image'), async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this business' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please attach an image file' });
    }

    if (business.images && business.images.length >= 5) {
      return res.status(400).json({ message: 'Maximum 5 storefront images allowed per business' });
    }

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

    business.images.push(imageUrl);
    await business.save();

    res.status(200).json(business);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error uploading image' });
  }
});

// @route   DELETE /api/businesses/:id/image
// @desc    Delete storefront photo from Cloudinary & business
// @access  Private (Owner only)
router.delete('/:id/image', protect, authorize('owner'), async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not own this business' });
    }

    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    // Remove from array
    business.images = business.images.filter(img => img !== imageUrl);
    await business.save();

    // Destroy on Cloudinary asynchronously
    deleteFromCloudinary(imageUrl).catch(err => console.error(err));

    res.status(200).json(business);
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Server error removing image' });
  }
});

module.exports = router;
