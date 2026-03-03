require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createSuperadmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingSuperadmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperadmin) {
      console.log('Superadmin already exists:', existingSuperadmin.email);
      process.exit(0);
    }

    const superadmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      passwordHash: 'superadmin123', // Will be hashed by pre-save hook
      role: 'superadmin',
      status: 'active',
    });

    console.log('Superadmin created successfully!');
    console.log('Email: superadmin@example.com');
    console.log('Password: superadmin123');
    console.log('You can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

createSuperadmin();
