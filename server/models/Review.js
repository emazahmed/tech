const mongoose = require('mongoose');

/**
 * Review Schema
 * Stores user reviews for products with ratings and comments
 */
const reviewSchema = new mongoose.Schema({
  // Product reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true
  },
  
  // User information (using session-based auth)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
    maxlength: [100, 'User name cannot exceed 100 characters']
  },
  
  userAvatar: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please provide a valid avatar URL']
  },
  
  // Review content
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  content: {
    type: String,
    required: [true, 'Review content is required'],
    trim: true,
    minlength: [20, 'Review must be at least 20 characters'],
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  },
  
  // Review metadata
  verified: {
    type: Boolean,
    default: false // Set to true if user has purchased the product
  },
  
  helpful: {
    type: Number,
    default: 0,
    min: [0, 'Helpful count cannot be negative']
  },
  
  notHelpful: {
    type: Number,
    default: 0,
    min: [0, 'Not helpful count cannot be negative']
  },
  
  // Review images (optional)
  images: [{
    type: String,
    match: [/^https?:\/\/.+/, 'Please provide valid image URLs']
  }],
  
  // Review status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Moderation
  isApproved: {
    type: Boolean,
    default: true // Auto-approve for now, can be changed for moderation
  },
  
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  moderationNotes: {
    type: String,
    maxlength: [500, 'Moderation notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ rating: -1 });
reviewSchema.index({ helpful: -1 });
reviewSchema.index({ isActive: 1, isApproved: 1 });

// Virtual for review age
reviewSchema.virtual('reviewAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for helpfulness ratio
reviewSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpful + this.notHelpful;
  return total > 0 ? (this.helpful / total) * 100 : 0;
});

// Static methods for querying
reviewSchema.statics.findByProduct = function(productId, options = {}) {
  const { 
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    rating,
    page = 1,
    limit = 20 
  } = options;
  
  let query = { 
    productId, 
    isActive: true, 
    isApproved: true 
  };
  
  if (rating) {
    query.rating = rating;
  }
  
  const sortObj = {};
  sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('userId', 'name avatar')
    .sort(sortObj)
    .skip(skip)
    .limit(limit);
};

reviewSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isActive: true })
    .populate('productId', 'name image')
    .sort({ createdAt: -1 });
};

reviewSchema.statics.getProductStats = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { 
        productId: new mongoose.Types.ObjectId(productId),
        isActive: true,
        isApproved: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const result = stats[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  result.ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });
  
  return {
    averageRating: Math.round(result.averageRating * 10) / 10,
    totalReviews: result.totalReviews,
    ratingDistribution: distribution
  };
};

// Instance methods
reviewSchema.methods.markHelpful = function(isHelpful) {
  if (isHelpful) {
    this.helpful += 1;
  } else {
    this.notHelpful += 1;
  }
  return this.save();
};

reviewSchema.methods.updateHelpfulness = function(previousVote, newVote) {
  // Remove previous vote
  if (previousVote === 'helpful') this.helpful = Math.max(0, this.helpful - 1);
  if (previousVote === 'not-helpful') this.notHelpful = Math.max(0, this.notHelpful - 1);
  
  // Add new vote
  if (newVote === 'helpful') this.helpful += 1;
  if (newVote === 'not-helpful') this.notHelpful += 1;
  
  return this.save();
};

// Pre-save middleware to update product rating
reviewSchema.post('save', async function() {
  try {
    const Product = mongoose.model('Product');
    const stats = await this.constructor.getProductStats(this.productId);
    
    await Product.findByIdAndUpdate(this.productId, {
      rating: stats.averageRating,
      reviews: stats.totalReviews
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
});

// Pre-remove middleware to update product rating
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const Product = mongoose.model('Product');
      const stats = await doc.constructor.getProductStats(doc.productId);
      
      await Product.findByIdAndUpdate(doc.productId, {
        rating: stats.averageRating,
        reviews: stats.totalReviews
      });
    } catch (error) {
      console.error('Error updating product rating after deletion:', error);
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);