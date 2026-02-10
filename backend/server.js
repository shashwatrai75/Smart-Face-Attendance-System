/**
 * SERVER ENTRY POINT
 * 
 * This file starts the Express server and connects to MongoDB.
 * Run this with: npm run dev (or node server.js)
 */

const app = require('./app');           // Express app configuration
const connectDB = require('./config/db'); // MongoDB connection
const config = require('./config/env');   // Environment variables

const PORT = config.PORT;

// Start server first, then connect to database
// This allows the server to respond even if DB connection is slow
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${config.NODE_ENV} mode`);
  console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
  console.log('📡 Connecting to MongoDB...');
  
  // Connect to database after server starts
  connectDB().catch((error) => {
    console.error('❌ Failed to connect to MongoDB. Server is running but database operations will fail.');
    console.error('Please check your MongoDB connection string and IP whitelist.');
  });
});

// Handle unhandled promise rejections (prevents crashes)
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

