require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const resetUserLock = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = process.argv[2] || 'admin@example.com';
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    await user.resetLoginAttempts();
    console.log(`Successfully reset login attempts for ${email}`);
    console.log('User is now unlocked and can login');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

resetUserLock();

