/**
 * EXPRESS APP CONFIGURATION
 * 
 * This file sets up the Express server:
 * - Configures middleware (CORS, JSON parsing)
 * - Registers all API routes
 * - Sets up error handling
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Import all API routes
const authRoutes = require('./routes/auth.routes');           // Login, register
const adminRoutes = require('./routes/admin.routes');         // Admin operations
const studentRoutes = require('./routes/student.routes');     // Student operations
const attendanceRoutes = require('./routes/attendance.routes'); // Attendance
const sectionRoutes = require('./routes/section.routes');       // Section management
const classSessionRoutes = require('./routes/classSession.routes'); // Class sessions (update/delete)
const checkInRoutes = require('./routes/checkIn.routes');       // Department check-in/out
const reportRoutes = require('./routes/report.routes');         // Reports
const userRoutes = require('./routes/user.routes');           // User profile
const superadminRoutes = require('./routes/superadmin.routes'); // Superadmin only
const faceRoutes = require('./routes/face.routes');             // Face enrollment/verification

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://smartface-frontend-v6.onrender.com'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded face images
// Files are stored under /uploads/faces and exposed as /uploads/...
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/class-sessions', classSessionRoutes);
app.use('/api/checkin', checkInRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/face', faceRoutes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

