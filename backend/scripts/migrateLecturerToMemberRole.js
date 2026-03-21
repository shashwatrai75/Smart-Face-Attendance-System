/**
 * One-time: updates User documents from role "lecturer" to "member".
 * Run after deploying the role rename: node scripts/migrateLecturerToMemberRole.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config/env');

async function run() {
  if (!config.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(config.MONGODB_URI);
  const result = await User.updateMany({ role: 'lecturer' }, { $set: { role: 'member' } });
  console.log(`Matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
