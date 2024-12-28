const express = require('express');
const { protect } = require('../middleware/auth');
const Blog = require('../models/Blog');
const User = require('../models/User');
const Comment = require('../models/Comment');

const router = express.Router();

// Home page
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find()
      .populate('author', 'username firstName lastName')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.render('home', {
      title: 'Home',
      blogs,
      currentPage: page,
      totalPages,
      user: req.user
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

// Authentication routes
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { title: 'Login' });
});

router.get('/register', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('auth/register', { title: 'Register' });
});

// Blog routes
router.get('/blogs/new', protect, (req, res) => {
  res.render('blog/form', { title: 'Create Blog', blog: null });
});

router.get('/blogs/:id', async (req, res) => {
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
      return res.status(404).render('error', { 
        error: { message: 'Blog not found' }
      });
    }

    res.render('blog/detail', {
      title: blog.title,
      blog,
      user: req.user
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

router.get('/blogs/:id/edit', protect, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).render('error', { 
        error: { message: 'Blog not found' }
      });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).render('error', { 
        error: { message: 'Not authorized to edit this blog' }
      });
    }

    res.render('blog/form', {
      title: 'Edit Blog',
      blog,
      user: req.user
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

// Profile routes
router.get('/profile', protect, async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.user._id })
      .sort('-createdAt')
      .limit(5);

    res.render('profile', {
      title: 'My Profile',
      user: req.user,
      blogs
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

router.get('/profile/edit', protect, (req, res) => {
  res.render('edit_profile', {
    title: 'Edit Profile',
    user: req.user
  });
});

// Admin route
router.get('/admin', protect, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).render('error', { 
      error: { message: 'Access denied' }
    });
  }

  try {
    const users = await User.find().select('-password');
    const blogs = await Blog.find().populate('author', 'username');
    const comments = await Comment.find().populate('author', 'username');

    res.render('admin', {
      title: 'Admin Dashboard',
      user: req.user,
      users,
      blogs,
      comments
    });
  } catch (error) {
    res.status(500).render('error', { error });
  }
});

// Legal pages
router.get('/terms', (req, res) => {
  res.render('terms', { title: 'Terms and Conditions' });
});

router.get('/privacy', (req, res) => {
  res.render('privacy', { title: 'Privacy Policy' });
});

module.exports = router;
