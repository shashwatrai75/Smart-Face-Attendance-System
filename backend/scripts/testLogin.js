require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test email
    const testEmail = 'kushal123@gmail.com';
    
    // Find user
    const user = await User.findOne({ email: testEmail.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User with email ${testEmail} not found in database.`);
      console.log('\nAvailable users:');
      const allUsers = await User.find({}).select('email role status');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.role}, ${u.status})`);
      });
      process.exit(1);
    }

    console.log(`✓ User found: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Is Locked: ${user.isLocked}`);
    console.log(`  Failed Attempts: ${user.failedLoginAttempts}`);

    // Test password comparison
    const testPassword = 'password123'; // Change this to test different passwords
    console.log(`\nTesting password: ${testPassword}`);
    
    const isMatch = await user.comparePassword(testPassword);
    console.log(`Password match: ${isMatch ? '✓ YES' : '❌ NO'}`);

    if (!isMatch) {
      console.log('\n⚠️  Password does not match. The user exists but the password is incorrect.');
      console.log('To reset the password, you can:');
      console.log('1. Use the createAdmin script to create a new admin');
      console.log('2. Or manually update the user in MongoDB');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testLogin();

