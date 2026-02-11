/**
 * EXPRESS APP CONFIGURATION
 * 
 * This file sets up the Express server:
 * - Configures middleware (CORS, JSON parsing)
 * - Registers all API routes
 * - Sets up error handling
 */

const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Import all API routes
const authRoutes = require('./routes/auth.routes');           // Login, register
const adminRoutes = require('./routes/admin.routes');         // Admin operations
const classRoutes = require('./routes/class.routes');         // Class management
const studentRoutes = require('./routes/student.routes');     // Student operations
const attendanceRoutes = require('./routes/attendance.routes'); // Attendance
const reportRoutes = require('./routes/report.routes');       // Reports
const userRoutes = require('./routes/user.routes');           // User profile

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://smartface-frontend-v5.onrender.com"
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const dbConnected = dbStatus === 1;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    databaseStatus: dbStatus // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

