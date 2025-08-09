const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/reviewController');
const { requireAuth, optionalAuth } = require('../middleware/session');

const router = express.Router();

/**
 * Validation rules for review creation
 */
const reviewValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
    
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
    
  body('content')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Review content must be between 20 and 1000 characters'),
    
  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),
    
  body('images.*')
    .optional()
    .isURL()
    .withMessage('All images must be valid URLs')
];

/**
 * Validation rules for review update (all fields optional)
 */
const reviewUpdateValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
    
  body('content')
    .optional()
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Review content must be between 20 and 1000 characters'),
    
  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),
    
  body('images.*')
    .optional()
    .isURL()
    .withMessage('All images must be valid URLs')
];

/**
 * Validation rules for voting on reviews
 */
const voteValidation = [
  body('isHelpful')
    .isBoolean()
    .withMessage('isHelpful must be a boolean value')
];

// Public routes
router.get('/', getReviews);
router.get('/product/:productId', getProductReviews);
router.get('/stats/:productId', getProductReviewStats);
router.get('/:id', getReview);

// Protected routes (require session authentication)
router.post('/', requireAuth, reviewValidation, createReview);
router.put('/:id', requireAuth, reviewUpdateValidation, updateReview);
router.delete('/:id', requireAuth, deleteReview);
router.post('/:id/vote', requireAuth, voteValidation, voteOnReview);
router.get('/user/me', requireAuth, getUserReviews);
router.get('/can-review/:productId', requireAuth, canReviewProduct);

module.exports = router;