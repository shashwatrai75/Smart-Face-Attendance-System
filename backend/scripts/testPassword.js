require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');
const bcrypt = require('bcrypt');

async function testPassword() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const email = process.argv[2] || 'super123@gmail.com';
    const password = process.argv[3] || 'admin123';

    console.log(`Testing password for: ${email}`);
    console.log(`Password to test: ${password}\n`);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✓ User found: ${user.email}`);
    console.log(`  Password Hash Present: ${user.passwordHash ? 'YES' : 'NO'}`);
    console.log(`  Hash Length: ${user.passwordHash ? user.passwordHash.length : 0}`);
    console.log(`  Hash Preview: ${user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'N/A'}\n`);

    // Test using the model method
    console.log('Testing with user.comparePassword()...');
    try {
      const isMatch = await user.comparePassword(password);
      console.log(`  Result: ${isMatch ? '✓ MATCH' : '❌ NO MATCH'}\n`);
    } catch (error) {
      console.log(`  Error: ${error.message}\n`);
    }

    // Test directly with bcrypt
    if (user.passwordHash) {
      console.log('Testing directly with bcrypt.compare()...');
      const directMatch = await bcrypt.compare(password, user.passwordHash);
      console.log(`  Result: ${directMatch ? '✓ MATCH' : '❌ NO MATCH'}\n`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPassword();

