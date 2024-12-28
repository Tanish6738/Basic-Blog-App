const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createBlog, editBlog, deleteBlog, getBlog } = require('../controllers/blogController');
const { ensureAuthenticated } = require('../middlewares/middleware');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb('Error: File upload only supports the following filetypes - ' + filetypes);
  }
});

router.get('/new', ensureAuthenticated, (req, res) => {
  res.render('create_blog', { categories: ['Nature', 'Wildlife', 'Household'] });
});

router.post('/new', ensureAuthenticated, upload.array('blogImage[]'), createBlog);

router.get('/edit/:id', ensureAuthenticated, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    req.flash('error_msg', 'Blog not found.');
    return res.redirect('/');
  }

  if (!blog.author.equals(req.session.user._id) && req.session.user.username !== 'Admin') {
    req.flash('error_msg', 'Unauthorized access.');
    return res.redirect('/');
  }

  res.render('edit_blog', { blog, categories: ['Nature', 'Wildlife', 'Household'] });
});

router.post('/edit/:id', ensureAuthenticated, upload.array('blogImage[]'), editBlog);

router.post('/delete/:id', ensureAuthenticated, deleteBlog);

router.get('/:id', getBlog);

module.exports = router;
