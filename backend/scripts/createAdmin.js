require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      await existingAdmin.resetLoginAttempts();
      console.log('Reset login attempts for existing admin');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'admin123', // Will be hashed by pre-save hook
      role: 'admin',
      status: 'active',
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('You can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createAdmin();

