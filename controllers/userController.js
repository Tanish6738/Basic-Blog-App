const bcrypt = require('bcrypt');
const User = require('../models/User');
const Blog = require('../models/Blog');

async function registerUser(req, res) {
  const { username, password, email, firstName, lastName } = req.body;
  const userExists = await User.findOne({ username });
  const emailExists = await User.findOne({ email });

  if (userExists || emailExists) {
    req.flash('error_msg', 'Username or email already exists.');
    return res.redirect('/register');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({
    username, 
    password: hashedPassword, 
    email, 
    firstName, 
    lastName, 
    profileImage: req.file ? req.file.filename : ''  // Save profile image filename
  });
  await user.save();
  req.session.user = user;
  req.flash('success_msg', 'Registration successful. You are now logged in.');
  res.redirect('/');
}

async function loginUser(req, res) {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    req.flash('error_msg', 'User not found.');
    return res.redirect('/login');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    req.flash('error_msg', 'Incorrect password.');
    return res.redirect('/login');
  }

  req.session.user = user;
  req.flash('success_msg', 'Login successful.');
  res.redirect('/');
}

async function getProfile(req, res) {
  const blogs = await Blog.find({ author: req.session.user._id }).exec();
  res.render('profile', { user: req.session.user, blogs });
}

async function editProfile(req, res) {
  const { firstName, lastName, email, username } = req.body;
  const user = await User.findById(req.session.user._id);

  if (user) {
    user.firstName = firstName;
    user.lastName = lastName;
    if (req.file) {
      user.profileImage = req.file.filename;
    }
    await user.save();
    req.session.user = user; 
    req.flash('success_msg', 'Profile updated successfully.');
  } else {
    req.flash('error_msg', 'User not found.');
  }
  res.redirect('/profile/');
}

async function deleteUser(req, res) {
  const userId = req.session.user._id;

  // Delete all blogs created by the user
  await Blog.deleteMany({ author: userId });

  // Delete the user
  await User.findByIdAndDelete(userId);
  
  req.session.destroy();
  res.redirect('/');
}

module.exports = { registerUser, loginUser, getProfile, editProfile, deleteUser };
