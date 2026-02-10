require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');
const bcrypt = require('bcrypt');

async function resetUserPassword() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const email = process.argv[2] || 'super123@gmail.com';
    const password = process.argv[3] || 'admin123';

    console.log(`Resetting password for user: ${email}`);
    console.log(`New password: ${password}\n`);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      console.log('Creating new user...');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({
        name: 'User',
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        role: 'admin',
        status: 'active',
      });
      
      // Use updateOne to set the hash directly (bypassing pre-save hook)
      await User.updateOne(
        { _id: newUser._id },
        { $set: { passwordHash: hashedPassword } }
      );
      
      console.log(`✓ User created: ${newUser.email}`);
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`✓ User found: ${user.email}`);
    console.log(`  Current password hash: ${user.passwordHash ? 'Present' : 'MISSING'}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Use updateOne to bypass pre-save hook (which would double-hash)
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash: hashedPassword } }
    );

    // Verify the password works
    const updatedUser = await User.findById(user._id);
    const testMatch = await bcrypt.compare(password, updatedUser.passwordHash);
    
    if (testMatch) {
      console.log(`✓ Password reset successfully!`);
      console.log(`  Hash length: ${updatedUser.passwordHash.length} characters`);
      console.log(`  Password verification: PASSED`);
      console.log(`\nYou can now login with:`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
    } else {
      console.log(`❌ Password verification FAILED - something went wrong`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetUserPassword();

