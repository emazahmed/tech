const Product = require('../models/Product');
const { validationResult } = require('express-validator');

/**
 * @desc    Get all products with filtering and pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      featured
    } = req.query;

    // Build query
    let query = { isActive: true };

    if (category) query.category = category;
    if (brand) query.brand = brand;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (inStock !== undefined) query.inStock = inStock === 'true';
    if (featured === 'true') query.isFeatured = true;

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } },
        { sku: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      data: {
        products,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasProducts: products.length > 0,
        message: products.length === 0 ? 'No products found' : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product'
    });
  }
};

const createProduct = async (req, res) => {
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

    const productData = { ...req.body };
    if (req.user?.id) {
      productData.createdBy = req.user.id;
      productData.updatedBy = req.user.id;
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

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
      message: 'Server error while creating product'
    });
  }
};

const updateProduct = async (req, res) => {
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

    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    });

    if (req.user?.id) {
      product.updatedBy = req.user.id;
    }
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
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
      message: 'Server error while updating product'
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = false;
    if (req.user?.id) {
      product.updatedBy = req.user.id;
    }
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
};

const toggleProductStock = async (req, res) => {
  try {
    const { inStock } = req.body;
    
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.inStock = inStock;
    if (req.user?.id) {
      product.updatedBy = req.user.id;
    }
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product stock status updated',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating stock status'
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.status(200).json({
      success: true,
      data: categories.sort()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

const getBrands = async (req, res) => {
  try {
    const brands = await Product.distinct('brand', { isActive: true });
    res.status(200).json({
      success: true,
      data: brands.sort()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching brands'
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const products = await Product.find({ 
      isActive: true, 
      isFeatured: true,
      inStock: true 
    })
    .sort({ rating: -1, createdAt: -1 })
    .limit(Number(limit));
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: { products }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured products'
    });
  }
};

const updateInventory = async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;
    
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (operation === 'add') {
      product.inventoryCount = (product.inventoryCount || 0) + quantity;
    } else if (operation === 'subtract') {
      product.inventoryCount = Math.max(0, (product.inventoryCount || 0) - quantity);
    } else {
      product.inventoryCount = quantity;
    }
    
    product.inStock = product.inventoryCount > 0;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while updating inventory'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStock,
  getCategories,
  getBrands,
  getFeaturedProducts,
  updateInventory
};
