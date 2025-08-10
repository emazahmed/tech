const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const { validationResult } = require('express-validator');

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
};

/**
 * @desc    Get all orders with filtering and pagination
 * @route   GET /api/orders  
 * @access  Private (Returns user's own orders, or all orders if admin)
 */
const getOrders = async (req, res) => {
  try {
    const {
      status,
      customerId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    let query = {};
    
    // If user is authenticated and not admin, show only their orders
    // If no authentication or admin access, show all orders
    if (req.userId && req.user?.role !== 'admin') {
      query.customerId = req.userId;
    } else if (customerId) {
      query.customerId = customerId;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const orders = await Order.find(query)
      .populate('customerId', 'name email')
      .populate('items.productId', 'name image brand')
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    // Get order statistics
    const stats = await Order.getOrderStats();

    res.status(200).json({
      success: true,
      count: orders.length,
      data: {
        orders,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        stats
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders'
    });
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private (User can only access their own orders, admin can access any)
 */
const getOrder = async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // For regular users, ensure they can only access their own orders
    // Allow admin panel access without authentication
    if (req.userId && req.user?.role !== 'admin') {
      query.customerId = req.userId;
    }
    
    const order = await Order.findOne(query)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name image brand category')
      .populate('statusHistory.updatedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order'
    });
  }
};

/**
 * @desc    Create new order from cart
 * @route   POST /api/orders
 * @access  Private (Authenticated users)
 */
const createOrder = async (req, res) => {
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

    const { shippingAddress, paymentInfo, notes, promoCode, items, pricing } = req.body;

    console.log('Received order request:', {
      items: items?.length || 0,
      pricing: pricing,
      shippingAddress: shippingAddress
    });

    // ✅ OPTION 1: Use items from request body if provided
    let orderItems = [];
    let subtotal = 0;

    if (items && items.length > 0) {
      console.log('Using items from request body');
      
      // Verify all products still exist and are available
      for (const item of items) {
        const product = await Product.findById(item.productId);
        
        if (!product || !product.isActive) {
          return res.status(400).json({
            success: false,
            message: `Product ${item.name || 'Unknown'} is no longer available`
          });
        }

        if (!product.inStock) {
          return res.status(400).json({
            success: false,
            message: `Product ${product.name} is out of stock`
          });
        }

        // Check inventory
        if (product.inventoryCount < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.inventoryCount} units of ${product.name} available`
          });
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          totalPrice: itemTotal,
          variant: item.variant || {}
        });
      }
    } else {
      console.log('No items in request, falling back to cart from database');
      
      // ✅ FALLBACK: Use cart from database (original logic)
      const cartItems = await Cart.getUserCart(req.userId);
      
      // Filter out items where product no longer exists
      const validCartItems = cartItems.filter(item => item.productId);
      
      if (!validCartItems || validCartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Your cart is empty. Please add some items before checkout.'
        });
      }

      // Process cart items (original logic)
      for (const cartItem of validCartItems) {
        const product = cartItem.productId;
        
        if (!product || !product.isActive) {
          return res.status(400).json({
            success: false,
            message: `Product ${cartItem.productId?.name || 'Unknown'} is no longer available`
          });
        }

        if (!product.inStock) {
          return res.status(400).json({
            success: false,
            message: `Product ${product.name} is out of stock`
          });
        }

        if (product.inventoryCount < cartItem.quantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.inventoryCount} units of ${product.name} available`
          });
        }

        const itemTotal = product.price * cartItem.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: cartItem.quantity,
          totalPrice: itemTotal,
          variant: cartItem.variant
        });
      }
    }

    // ✅ Use pricing from request if provided, otherwise calculate
    let finalPricing;
    
    if (pricing && pricing.total) {
      console.log('Using pricing from request body');
      finalPricing = {
        subtotal: parseFloat(pricing.subtotal.toFixed(2)),
        tax: parseFloat(pricing.tax.toFixed(2)),
        shipping: parseFloat(pricing.shipping.toFixed(2)),
        discount: parseFloat((pricing.discount || 0).toFixed(2)),
        total: parseFloat(pricing.total.toFixed(2))
      };
    } else {
      console.log('Calculating pricing on backend');
      // Calculate pricing (original logic)
      const tax = subtotal * 0.08; // 8% tax
      const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
      let discount = 0;

      // Apply promo code discount
      if (promoCode) {
        if (promoCode === 'WELCOME20') {
          discount = subtotal * 0.2; // 20% discount
        } else if (promoCode === 'SAVE10') {
          discount = subtotal * 0.1; // 10% discount
        }
      }

      const total = subtotal + tax + shipping - discount;
      
      finalPricing = {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      };
    }

    // Get customer info
    const customer = await mongoose.model('User').findById(req.userId);
    
    // Generate unique order number
    const orderNumber = generateOrderNumber();

    // Create order
    const order = await Order.create({
      orderNumber,
      customerId: req.userId,
      customerInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || shippingAddress.phone
      },
      items: orderItems,
      pricing: finalPricing,
      shippingAddress,
      paymentInfo: {
        method: paymentInfo.method,
        status: 'completed',
        transactionId: paymentInfo.transactionId,
        lastFour: paymentInfo.lastFour
      },
      notes,
      promoCode
    });

    // Update product inventory
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        await product.updateStock(-item.quantity);
      }
    }

    // Clear user's cart
    await Cart.clearCart(req.userId);

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name email')
      .populate('items.productId', 'name image brand');

    console.log('Order created successfully:', order._id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order: populatedOrder }
    });
  } catch (error) {
    console.error('Create order error:', error);
    
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
      message: 'Server error while creating order'
    });
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private (Admin only)
 */
const updateOrderStatus = async (req, res) => {
  try {
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

    const { status, notes, trackingNumber, carrier, estimatedDelivery } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status with history
    await order.updateStatus(status, req.userId || null, notes);

    // Add tracking information if provided
    if (trackingNumber && carrier) {
      await order.addTracking(trackingNumber, carrier, estimatedDelivery);
    }

    // Populate for response
    const updatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name email')
      .populate('items.productId', 'name image brand');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status'
    });
  }
};

/**
 * @desc    Cancel order
 * @route   DELETE /api/orders/:id
 * @access  Private (Admin or Order Owner)
 */
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order that has been shipped or delivered'
      });
    }

    // Update status to cancelled
    await order.updateStatus('cancelled', req.userId || null, 'Order cancelled by admin');

    // Restore product inventory
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        await product.updateStock(item.quantity);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling order'
    });
  }
};

/**
 * @desc    Get customer's orders
 * @route   GET /api/orders/customer/:customerId
 * @access  Private (Admin or Customer)
 */
const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find({ customerId })
      .populate('items.productId', 'name image brand')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments({ customerId });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: {
        orders,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching customer orders'
    });
  }
};

/**
 * @desc    Get order statistics for dashboard
 * @route   GET /api/orders/stats
 * @access  Private (Admin only)
 */
const getOrderStats = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(period));

    // Get basic stats
    const totalOrders = await Order.countDocuments();
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Get status breakdown
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.total' }
        }
      }
    ]);

    // Get revenue stats
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Get daily order counts for the last 7 days
    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalOrders,
          recentOrders,
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          averageOrderValue: revenueStats[0]?.averageOrderValue || 0
        },
        statusBreakdown: statusStats,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order statistics'
    });
  }
};

/**
 * @desc    Get recent orders for dashboard
 * @route   GET /api/orders/recent
 * @access  Private (Admin only)
 */
const getRecentOrders = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const orders = await Order.find()
      .populate('customerId', 'name email')
      .populate('items.productId', 'name image')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: orders.length,
      data: { orders }
    });
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent orders'
    });
  }
};

/**
 * @desc    Bulk update order status
 * @route   PUT /api/orders/bulk-status
 * @access  Private (Admin only)
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderIds, status, notes } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    // Update all orders
    const updatePromises = orderIds.map(async (orderId) => {
      const order = await Order.findById(orderId);
      if (order) {
        return order.updateStatus(status, req.userId || null, notes);
      }
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `${orderIds.length} orders updated successfully`
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating orders'
    });
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getCustomerOrders,
  getOrderStats,
  getRecentOrders,
  bulkUpdateStatus
};