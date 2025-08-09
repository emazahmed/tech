const mongoose = require('mongoose');

/**
 * Order Schema
 * Stores customer orders with items, status tracking, and payment information
 */
const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Customer information
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  customerInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Order items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    variant: {
      size: String,
      color: String,
      model: String
    }
  }],
  
  // Pricing breakdown
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  // Shipping information
  shippingAddress: {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'United States'
    }
  },
  
  // Payment information
  paymentInfo: {
    method: {
      type: String,
      required: true,
      enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    lastFour: String // Last 4 digits of card
  },
  
  // Tracking information
  tracking: {
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    actualDelivery: Date
  },
  
  // Order metadata
  notes: {
    type: String,
    maxlength: 1000
  },
  
  promoCode: String,
  
  // Admin information
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ 'customerInfo.name': 'text' });
orderSchema.index({ createdAt: -1 });

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate unique order number
    const count = await this.constructor.countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;
    
    // Add initial status to history
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.processedBy
    });
  }
  next();
});

// Static methods for querying
orderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

orderSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

orderSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

orderSchema.statics.searchOrders = function(query) {
  return this.find({
    $or: [
      { orderNumber: { $regex: query, $options: 'i' } },
      { 'customerInfo.name': { $regex: query, $options: 'i' } },
      { 'customerInfo.email': { $regex: query, $options: 'i' } }
    ]
  }).sort({ createdAt: -1 });
};

orderSchema.statics.getOrderStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$pricing.total' }
      }
    }
  ]);
  
  return stats;
};

// Instance methods
orderSchema.methods.updateStatus = async function(newStatus, updatedBy, notes) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    notes
  });
  
  return await this.save();
};

orderSchema.methods.addTracking = function(trackingNumber, carrier, estimatedDelivery) {
  this.tracking.trackingNumber = trackingNumber;
  this.tracking.carrier = carrier;
  this.tracking.estimatedDelivery = estimatedDelivery;
  
  return this.save();
};

orderSchema.methods.markAsDelivered = function(actualDelivery) {
  this.status = 'delivered';
  this.tracking.actualDelivery = actualDelivery || new Date();
  this.statusHistory.push({
    status: 'delivered',
    timestamp: new Date()
  });
  
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);