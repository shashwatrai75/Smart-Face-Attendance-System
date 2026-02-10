const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Set connection options with timeout
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 10000, // 10 seconds
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      logger.error('IP Whitelist Issue: Make sure your IP is whitelisted in MongoDB Atlas');
      logger.error('Go to: https://cloud.mongodb.com/ → Network Access → Add IP Address');
    } else if (error.message.includes('authentication failed')) {
      logger.error('Authentication Failed: Check your MongoDB username and password');
    } else if (error.message.includes('timeout') || error.message.includes('buffering')) {
      logger.error('Connection Timeout: Check your internet connection and MongoDB Atlas IP whitelist');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;

