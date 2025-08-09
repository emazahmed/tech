const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

/**
 * @desc    Get all reviews with filtering and pagination
 * @route   GET /api/reviews
 * @access  Public
 */
const getReviews = async (req, res) => {
  try {
    const {
      productId,
      userId,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = { isActive: true, isApproved: true };

    if (productId) {
      query.productId = productId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (rating) {
      query.rating = Number(rating);
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const reviews = await Review.find(query)
      .populate('userId', 'name avatar')
      .populate('productId', 'name image brand')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Review.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: {
        reviews,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
};

/**
 * @desc    Get single review
 * @route   GET /api/reviews/:id
 * @access  Public
 */
const getReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      isActive: true,
      isApproved: true
    })
    .populate('userId', 'name avatar')
    .populate('productId', 'name image brand');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review'
    });
  }
};

/**
 * @desc    Get reviews for a specific product
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Verify product exists
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get reviews using static method
    const reviews = await Review.findByProduct(productId, {
      rating: rating ? Number(rating) : undefined,
      sortBy,
      sortOrder,
      page: Number(page),
      limit: Number(limit)
    });

    // Get total count
    let countQuery = { productId, isActive: true, isApproved: true };
    if (rating) {
      countQuery.rating = Number(rating);
    }
    const total = await Review.countDocuments(countQuery);
    const totalPages = Math.ceil(total / Number(limit));

    // Get product review statistics
    const stats = await Review.getProductStats(productId);

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: {
        reviews,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        stats
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product reviews'
    });
  }
};

/**
 * @desc    Create new review
 * @route   POST /api/reviews
 * @access  Private (Session-based)
 */
const createReview = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    const { productId, rating, title, content, images } = req.body;

    // Verify product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or no longer available'
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      userId: req.userId,
      productId,
      isActive: true
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product. You can edit your existing review instead.'
      });
    }

    // Check if user has purchased this product (optional verification)
    const hasPurchased = await Order.findOne({
      customerId: req.userId,
      'items.productId': productId,
      status: { $in: ['delivered', 'shipped'] }
    });

    // Get user info from session
    const User = require('../models/User');
    const user = await User.findById(req.userId);

    // Create review
    const review = await Review.create({
      productId,
      userId: req.userId,
      userName: user.name,
      userAvatar: user.avatar,
      rating,
      title,
      content,
      images: images || [],
      verified: !!hasPurchased
    });

    // Populate for response
    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name avatar')
      .populate('productId', 'name image brand');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review: populatedReview }
    });
  } catch (error) {
    console.error('Create review error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
};

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private (Session-based, own reviews only)
 */
const updateReview = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      userId: req.userId, // Users can only update their own reviews
      isActive: true
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to edit it'
      });
    }

    const { rating, title, content, images } = req.body;

    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (content !== undefined) review.content = content;
    if (images !== undefined) review.images = images;

    await review.save();

    // Populate for response
    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name avatar')
      .populate('productId', 'name image brand');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review: populatedReview }
    });
  } catch (error) {
    console.error('Update review error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating review'
    });
  }
};

/**
 * @desc    Delete review (soft delete)
 * @route   DELETE /api/reviews/:id
 * @access  Private (Session-based, own reviews only or admin)
 */
const deleteReview = async (req, res) => {
  try {
    let query = { _id: req.params.id, isActive: true };
    
    // Regular users can only delete their own reviews
    if (req.user?.role !== 'admin') {
      query.userId = req.userId;
    }

    const review = await Review.findOne(query);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to delete it'
      });
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
};

/**
 * @desc    Vote on review helpfulness
 * @route   POST /api/reviews/:id/vote
 * @access  Private (Session-based)
 */
const voteOnReview = async (req, res) => {
  try {
    const { isHelpful } = req.body;
    
    if (typeof isHelpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isHelpful must be a boolean value'
      });
    }

    const review = await Review.findOne({
      _id: req.params.id,
      isActive: true,
      isApproved: true
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Users cannot vote on their own reviews
    if (review.userId.toString() === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot vote on your own review'
      });
    }

    // Update helpfulness count
    await review.markHelpful(isHelpful);

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        helpful: review.helpful,
        notHelpful: review.notHelpful
      }
    });
  } catch (error) {
    console.error('Vote on review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording vote'
    });
  }
};

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/user/me
 * @access  Private (Session-based)
 */
const getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const reviews = await Review.find({
      userId: req.userId,
      isActive: true
    })
    .populate('productId', 'name image brand')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

    const total = await Review.countDocuments({
      userId: req.userId,
      isActive: true
    });

    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: {
        reviews,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user reviews'
    });
  }
};

/**
 * @desc    Check if user can review product
 * @route   GET /api/reviews/can-review/:productId
 * @access  Private (Session-based)
 */
const canReviewProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      userId: req.userId,
      productId,
      isActive: true
    });

    if (existingReview) {
      return res.status(200).json({
        success: true,
        data: {
          canReview: false,
          reason: 'already_reviewed',
          existingReview: {
            id: existingReview._id,
            rating: existingReview.rating,
            title: existingReview.title,
            content: existingReview.content
          }
        }
      });
    }

    // Check if user has purchased this product
    const hasPurchased = await Order.findOne({
      customerId: req.userId,
      'items.productId': productId,
      status: { $in: ['delivered', 'shipped'] }
    });

    res.status(200).json({
      success: true,
      data: {
        canReview: true,
        hasPurchased: !!hasPurchased,
        verified: !!hasPurchased
      }
    });
  } catch (error) {
    console.error('Can review product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking review eligibility'
    });
  }
};

/**
 * @desc    Get product review statistics
 * @route   GET /api/reviews/stats/:productId
 * @access  Public
 */
const getProductReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const stats = await Review.getProductStats(productId);

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get product review stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching review statistics'
    });
  }
};

module.exports = {
  getReviews,
  getReview,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  voteOnReview,
  getUserReviews,
  canReviewProduct,
  getProductReviewStats
};