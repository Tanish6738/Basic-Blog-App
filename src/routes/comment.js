const express = require('express');
const { body } = require('express-validator');
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// Validation rules
const commentValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

const replyValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reply must be between 1 and 500 characters')
];

// Create comment
router.post('/:blogId',
  protect,
  validate(commentValidation),
  async (req, res, next) => {
    try {
      const blog = await Blog.findById(req.params.blogId);
      
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      const comment = await Comment.create({
        text: req.body.text,
        author: req.user._id,
        blog: req.params.blogId
      });

      // Populate author details
      await comment.populate('author', 'username firstName lastName');

      logger.info(`Comment created: ${comment._id} on blog: ${blog._id}`);

      res.status(201).json({
        success: true,
        data: comment
      });
    } catch (error) {
      next(error);
    }
});

// Get comments for a blog
router.get('/blog/:blogId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const comments = await Comment.find({ blog: req.params.blogId })
      .populate('author', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Comment.countDocuments({ blog: req.params.blogId });

    res.json({
      success: true,
      data: comments,
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

// Update comment
router.put('/:id',
  protect,
  validate(commentValidation),
  async (req, res, next) => {
    try {
      let comment = await Comment.findById(req.params.id);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check ownership
      if (comment.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this comment'
        });
      }

      comment = await Comment.findByIdAndUpdate(
        req.params.id,
        {
          text: req.body.text,
          isEdited: true
        },
        { new: true, runValidators: true }
      ).populate('author', 'username firstName lastName');

      logger.info(`Comment updated: ${comment._id}`);

      res.json({
        success: true,
        data: comment
      });
    } catch (error) {
      next(error);
    }
});

// Delete comment
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this comment'
      });
    }

    await comment.remove();

    logger.info(`Comment deleted: ${comment._id}`);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// Add reply to comment
router.post('/:id/reply',
  protect,
  validate(replyValidation),
  async (req, res, next) => {
    try {
      const comment = await Comment.findById(req.params.id);

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      comment.replies.push({
        text: req.body.text,
        author: req.user._id
      });

      await comment.save();
      await comment.populate('replies.author', 'username firstName lastName');

      logger.info(`Reply added to comment: ${comment._id}`);

      res.json({
        success: true,
        data: comment.replies[comment.replies.length - 1]
      });
    } catch (error) {
      next(error);
    }
});

// Like/Unlike comment
router.post('/:id/like', protect, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if already liked
    const isLiked = comment.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike
      comment.likes = comment.likes.filter(
        like => like.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      comment.likes.push(req.user._id);
    }

    await comment.save();

    res.json({
      success: true,
      data: {
        likes: comment.likes.length,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
