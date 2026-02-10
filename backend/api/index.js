/**
 * VERCEL SERVERLESS FUNCTION WRAPPER
 * 
 * This file wraps the Express app for Vercel's serverless functions.
 * Vercel will use this as the entry point for all API requests.
 */

const app = require('../app');
const mongoose = require('mongoose');

// Cache the database connection across serverless function invocations
let cachedConnection = null;

const connectDB = async () => {
  // If we have a cached connection and it's ready, use it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // If connection exists but is not ready, close it
  if (cachedConnection) {
    await mongoose.connection.close();
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds for serverless
      socketTimeoutMS: 45000,
      connectTimeoutMS: 5000,
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    cachedConnection = conn;
    console.log('✅ MongoDB Connected:', conn.connection.host);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('IP') || error.message.includes('whitelist')) {
      console.error('IP Whitelist Issue: Make sure your IP is whitelisted in MongoDB Atlas');
    } else if (error.message.includes('authentication failed')) {
      console.error('Authentication Failed: Check your MongoDB username and password');
    }
    
    // Don't throw - let the app handle the error gracefully
    // In serverless, we don't want to crash the function
    return null;
  }
};

// Export as Vercel serverless function
module.exports = async (req, res) => {
  // Connect to database if needed
  // This will reuse connections across warm invocations
  await connectDB();
  
  // Handle the request with Express app
  return app(req, res);
};

