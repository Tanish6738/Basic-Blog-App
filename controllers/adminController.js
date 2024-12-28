const bcrypt = require('bcrypt');
const User = require('../models/User');

async function createAdminUser() {
  const adminExists = await User.findOne({ username: 'Admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'Admin',
      password: hashedPassword,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User'
    });
    await adminUser.save();
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists.');
  }
}

module.exports = { createAdminUser };
