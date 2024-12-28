const express = require('express');
const { body, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Blog = require('../models/Blog');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: './public/uploads/blog',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Validation rules
const blogValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('content.*.text')
    .trim()
    .notEmpty()
    .withMessage('Content text is required'),
  body('category')
    .isIn(['Nature', 'Wildlife', 'Household'])
    .withMessage('Invalid category'),
  body('keywords')
    .isArray()
    .withMessage('Keywords must be an array')
    .custom((value) => value.every(keyword => 
      typeof keyword === 'string' && keyword.length <= 30
    ))
    .withMessage('Keywords must be strings of max 30 characters')
];

// Create blog
router.post('/', 
  protect,
  upload.array('images', 10),
  validate(blogValidation),
  async (req, res, next) => {
    try {
      const blogData = {
        title: req.body.title,
        content: JSON.parse(req.body.content),
        category: req.body.category,
        keywords: req.body.keywords,
        author: req.user._id
      };

      // Add uploaded image paths to content
      if (req.files) {
        blogData.content = blogData.content.map((item, index) => ({
          ...item,
          image: req.files[index] ? `/uploads/blog/${req.files[index].filename}` : null
        }));
      }

      const blog = await Blog.create(blogData);
      
      logger.info(`Blog created: ${blog._id} by user: ${req.user._id}`);

      res.status(201).json({
        success: true,
        data: blog
      });
    } catch (error) {
      next(error);
    }
});

// Get all blogs with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = {};
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by keyword
    if (req.query.keyword) {
      query.keywords = req.query.keyword;
    }

    // Search in title and content
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const blogs = await Blog.find(query)
      .populate('author', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: blogs,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalDocs: total
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single blog
router.get('/:id', async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username firstName lastName')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username firstName lastName'
        }
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    next(error);
  }
});

// Update blog
router.put('/:id',
  protect,
  upload.array('images', 10),
  validate(blogValidation),
  async (req, res, next) => {
    try {
      let blog = await Blog.findById(req.params.id);

      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      // Check ownership
      if (blog.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this blog'
        });
      }

      const blogData = {
        title: req.body.title,
        content: JSON.parse(req.body.content),
        category: req.body.category,
        keywords: req.body.keywords
      };

      // Add uploaded image paths to content
      if (req.files) {
        blogData.content = blogData.content.map((item, index) => ({
          ...item,
          image: req.files[index] ? `/uploads/blog/${req.files[index].filename}` : item.image
        }));
      }

      blog = await Blog.findByIdAndUpdate(
        req.params.id,
        blogData,
        { new: true, runValidators: true }
      );

      logger.info(`Blog updated: ${blog._id} by user: ${req.user._id}`);

      res.json({
        success: true,
        data: blog
      });
    } catch (error) {
      next(error);
    }
});

// Delete blog
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    // Check ownership
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this blog'
      });
    }

    await blog.remove();
    
    logger.info(`Blog deleted: ${blog._id} by user: ${req.user._id}`);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// Like/Unlike blog
router.post('/:id/like', protect, async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    // Check if already liked
    const isLiked = blog.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike
      blog.likes = blog.likes.filter(
        like => like.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      blog.likes.push(req.user._id);
    }

    await blog.save();

    res.json({
      success: true,
      data: {
        likes: blog.likes.length,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
