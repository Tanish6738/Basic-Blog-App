const express = require('express');
const router = express.Router();
const multer = require('multer');
const { registerUser, loginUser, getProfile, editProfile, deleteUser } = require('../controllers/userController');
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

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', upload.single('profileImage'), registerUser);

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', loginUser);

router.get('/profile', ensureAuthenticated, getProfile);

router.get('/profile/edit', ensureAuthenticated, (req, res) => {
  res.render('edit_profile', { user: req.session.user });
});

router.post('/profile/edit', ensureAuthenticated, upload.single('profileImage'), editProfile);

router.post('/profile/delete', ensureAuthenticated, deleteUser);

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/profile');
    }
    res.clearCookie('connect.sid');
    req.flash('success_msg', 'You have logged out successfully.');
    res.redirect('/');
  });
});

module.exports = router;
