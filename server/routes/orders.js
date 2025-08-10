const express = require('express');
const { body } = require('express-validator');
const { requireAuth, optionalAuth } = require('../middleware/session'); // Import the auth middleware
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getCustomerOrders,
  getOrderStats,
  getRecentOrders,
  bulkUpdateStatus
} = require('../controllers/orderController');

const router = express.Router();
/**
 * Validation rules for order creation
 */
const createOrderValidation = [
  body('shippingAddress.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Recipient name must be between 2 and 100 characters'),
    
  body('shippingAddress.address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
    
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
    
  body('shippingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
    
  body('shippingAddress.zipCode')
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage('Please provide a valid ZIP code'),
    
  body('shippingAddress.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
    
  body('paymentInfo.method')
    .isIn(['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'])
    .withMessage('Invalid payment method'),
    
  body('paymentInfo.transactionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Transaction ID cannot exceed 100 characters'),
    
  body('paymentInfo.lastFour')
    .optional()
    .matches(/^\d{4}$/)
    .withMessage('Last four digits must be exactly 4 numbers'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
    
  body('promoCode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Promo code cannot exceed 50 characters')
];

/**
 * Validation rules for status update
 */
const statusUpdateValidation = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
    
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tracking number cannot exceed 100 characters'),
    
  body('carrier')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Carrier name cannot exceed 100 characters'),
    
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Estimated delivery must be a valid date')
];

/**
 * Validation rules for bulk status update
 */
const bulkStatusUpdateValidation = [
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs array is required'),
    
  body('orderIds.*')
    .isMongoId()
    .withMessage('All order IDs must be valid'),
    
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Order routes
router.get('/', optionalAuth, getOrders); // Allow without auth for admin panel
router.get('/stats', optionalAuth, getOrderStats); // Allow without auth for admin panel
router.get('/recent', optionalAuth, getRecentOrders); // Allow without auth for admin panel
router.get('/customer/:customerId', requireAuth, getCustomerOrders);
router.get('/:id', optionalAuth, getOrder); // Allow without auth for admin panel
router.post('/', requireAuth, createOrderValidation, createOrder); // This is the important one!
router.put('/:id/status', optionalAuth, statusUpdateValidation, updateOrderStatus); // Allow without auth for admin panel
router.put('/bulk-status', optionalAuth, bulkStatusUpdateValidation, bulkUpdateStatus); // Allow without auth for admin panel
router.delete('/:id', optionalAuth, cancelOrder); // Allow without auth for admin panel

module.exports = router;