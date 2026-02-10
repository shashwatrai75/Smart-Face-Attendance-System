require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');

async function listUsers() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({}).select('email role status name passwordHash');
    
    console.log(`Found ${users.length} user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Password Hash: ${user.passwordHash ? '✓ Present (' + user.passwordHash.length + ' chars)' : '✗ MISSING'}`);
      console.log('');
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listUsers();

