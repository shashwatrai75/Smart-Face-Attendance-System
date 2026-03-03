/**
 * SERVER ENTRY POINT
 *
 * This file starts the Express server and connects to MongoDB.
 * Run this with: npm run dev (or node server.js)
 */

const net = require('net');
const app = require('./app'); // Express app configuration
const connectDB = require('./config/db'); // MongoDB connection
const config = require('./config/env'); // Environment variables

// Base port: read from process.env.PORT, default to 5000
const BASE_PORT = parseInt(process.env.PORT, 10) || 5000;

/**
 * Check if a port is available by trying to bind a temporary server.
 */
const isPortAvailable = (port) =>
  new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port);
  });

/**
 * Find the first available port starting from `startPort`.
 */
const getAvailablePort = async (startPort, maxAttempts = 20) => {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortAvailable(port);
    if (free) return port;
    port += 1;
  }
  throw new Error(
    `No available ports found from ${startPort} to ${startPort + maxAttempts - 1}`,
  );
};

let server;

const startServer = async () => {
  try {
    let port = await getAvailablePort(BASE_PORT);
    if (port !== BASE_PORT) {
      console.log(
        `Port ${BASE_PORT} is in use. Switching to available port: ${port}`,
      );
    }

    server = app.listen(port, () => {
      console.log(
        `✅ Server running on port ${port} in ${config.NODE_ENV} mode`,
      );
      console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
      console.log('📡 Connecting to MongoDB...');

      // Connect to database after server starts
      connectDB().catch(() => {
        console.error(
          '❌ Failed to connect to MongoDB. Server is running but database operations will fail.',
        );
        console.error(
          'Please check your MongoDB connection string and IP whitelist.',
        );
      });
    });

    // Handle server-level errors, especially EADDRINUSE
    server.on('error', async (err) => {
      if (err.code === 'EADDRINUSE') {
        try {
          const newPort = await getAvailablePort(port + 1);
          console.error(
            `Port ${port} is in use. Switching to available port: ${newPort}`,
          );
          port = newPort;
          server.close(() => {
            server = app.listen(port, () => {
              console.log(
                `✅ Server re-started on port ${port} in ${config.NODE_ENV} mode`,
              );
            });
          });
        } catch (portErr) {
          console.error('❌ Failed to find an available port:', portErr);
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', err);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections (prevents crashes)
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  if (server && server.close) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

