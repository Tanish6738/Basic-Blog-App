const express = require('express');
const router = express.Router();
const { ensureAuthenticated, setIsAdmin } = require('../middlewares/middleware');
const Blog = require('../models/Blog');
const User = require('../models/User');

router.get('/', ensureAuthenticated, async (req, res) => {
  if (!setIsAdmin(req.session.user)) {
    req.flash('error_msg', 'Unauthorized access.');
    return res.redirect('/');
  }

  const blogs = await Blog.find().populate('author', 'username').exec();
  const users = await User.find().exec();

  // Calculate userBlogsCount
  const userBlogsCount = await Blog.aggregate([
    {
      $group: {
        _id: "$author",
        count: { $sum: 1 }
      }
    }
  ]);

  res.render('admin', { blogs, users, userBlogsCount });
});

router.post('/blogs/:id/delete', ensureAuthenticated, async (req, res) => {
  if (!setIsAdmin(req.session.user)) {
    req.flash('error_msg', 'Access denied.');
    return res.redirect('/');
  }

  await Blog.findByIdAndDelete(req.params.id);
  req.flash('success_msg', 'Blog deleted successfully.');
  res.redirect('/admin');
});

router.post('/users/:id/delete', ensureAuthenticated, async (req, res) => {
  if (!setIsAdmin(req.session.user)) {
    req.flash('error_msg', 'Unauthorized access.');
    return res.redirect('/');
  }

  await User.findByIdAndDelete(req.params.id);
  req.flash('success_msg', 'User deleted successfully.');
  res.redirect('/admin');
});

module.exports = router;
