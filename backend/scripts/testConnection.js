require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/env');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', config.MONGODB_URI ? 'Found' : 'Missing');
    
    await mongoose.connect(config.MONGODB_URI);
    console.log('✓ MongoDB connection successful!');
    console.log('Connected to:', mongoose.connection.host);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.log('✗ MongoDB connection failed!');
    console.log('Error:', error.message);
    
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.log('\n⚠️  IP Whitelist Issue Detected!');
      console.log('\nTo fix this:');
      console.log('1. Go to: https://cloud.mongodb.com/');
      console.log('2. Select your cluster');
      console.log('3. Click "Network Access" in the left sidebar');
      console.log('4. Click "Add IP Address"');
      console.log('5. Click "Add Current IP Address" (or enter 0.0.0.0/0 for development)');
      console.log('6. Click "Confirm"');
      console.log('\nThen try running the backend again!');
    }
    
    process.exit(1);
  }
}

testConnection();

