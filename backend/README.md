# Backend Directory

This folder contains the Node.js/Express backend server.

## 📁 Directory Structure

### `config/` - Configuration
- **db.js** - MongoDB database connection
- **env.js** - Environment variables (PORT, MongoDB URI, JWT secret, etc.)

### `models/` - Database Models
Mongoose schemas that define your data structure:
- **User.js** - Users (admin, teacher, viewer)
- **Student.js** - Student information
- **Class.js** - Class/course information
- **Attendance.js** - Attendance records
- **AttendanceSession.js** - Active attendance sessions
- **AuditLog.js** - System activity logs

### `controllers/` - Business Logic
Handles the actual work for each feature:
- **authController.js** - Login, registration
- **adminController.js** - Admin operations (create users, view stats)
- **userController.js** - User profile management
- **classController.js** - Create/edit/delete classes
- **studentController.js** - Student enrollment and management
- **attendanceController.js** - Mark attendance, start sessions
- **reportController.js** - Generate reports (Excel/CSV)

### `routes/` - API Endpoints
Defines the URL paths for your API:
- Each file maps to a controller (e.g., `auth.routes.js` → `authController.js`)
- Example: `POST /api/auth/login` → `authController.login()`

### `middleware/` - Request Processing
Functions that run before your controllers:
- **authMiddleware.js** - Checks if user is logged in (JWT)
- **roleMiddleware.js** - Checks user permissions (admin/teacher/viewer)
- **validate.js** - Validates request data
- **rateLimit.js** - Prevents too many requests
- **errorHandler.js** - Handles errors gracefully

### `utils/` - Helper Functions
Reusable utility functions:
- **crypto.js** - Encrypts/decrypts face embeddings
- **excelExport.js** - Creates Excel files for reports
- **logger.js** - Logs messages to console/file

### `scripts/` - Utility Scripts
Run these with: `node scripts/script-name.js`
- **createAdmin.js** - Create admin user
- **fixUserPassword.js** - Reset user password
- **checkUser.js** - View user details
- **listUsers.js** - List all users

## 🚀 How It Works

1. **Request comes in** → `server.js` receives it
2. **Routes** → Determines which controller to use
3. **Middleware** → Checks authentication, validates data
4. **Controller** → Does the work (reads/writes database)
5. **Response** → Sends data back to frontend

## 📝 Key Files

- **server.js** - Starts the server
- **app.js** - Configures Express (middleware, routes)
- **package.json** - Lists dependencies

