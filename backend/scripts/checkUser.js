require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');

async function checkUser() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const email = process.argv[2] || 'admin@smartface.com';
    console.log(`Checking user: ${email}\n`);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('\nAvailable users:');
      const allUsers = await User.find({}).select('email role status passwordHash');
      allUsers.forEach(u => {
        const hasPassword = u.passwordHash ? '✓' : '✗';
        console.log(`  ${hasPassword} ${u.email} (${u.role}, ${u.status})`);
      });
      process.exit(1);
    }

    console.log(`✓ User found: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Password Hash: ${user.passwordHash ? '✓ Present' : '✗ MISSING!'}`);
    console.log(`  Hash Length: ${user.passwordHash ? user.passwordHash.length : 0} characters`);

    if (!user.passwordHash) {
      console.log('\n⚠️  PROBLEM: User has no password hash!');
      console.log('This user cannot login. You need to:');
      console.log('1. Delete this user and create a new one');
      console.log('2. Or update the password hash manually');
      process.exit(1);
    }

    if (user.passwordHash.length < 50) {
      console.log('\n⚠️  WARNING: Password hash seems too short!');
      console.log('Normal bcrypt hashes are 60 characters long.');
    }

    await mongoose.disconnect();
    console.log('\n✓ User check completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser();

