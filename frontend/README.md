# Frontend Directory

This folder contains the React frontend application.

## 📁 Directory Structure

### `src/pages/` - Main Pages
The 11 main screens of your app:
- **Login.jsx** - Login page
- **AdminDashboard.jsx** - Admin home page
- **LecturerDashboard.jsx** - Teacher home page
- **UserManagement.jsx** - Manage users (admin only)
- **ClassManagement.jsx** - Manage classes (admin only)
- **StudentEnrollment.jsx** - Enroll students with face capture
- **LiveAttendance.jsx** - Real-time attendance capture
- **AttendanceHistory.jsx** - View past attendance
- **Reports.jsx** - Generate and view reports
- **Profile.jsx** - User profile settings
- **Register.jsx** - Create new users (admin only)

### `src/components/` - Reusable Components
UI components used across multiple pages:
- **Navbar.jsx** - Top navigation bar
- **Sidebar.jsx** - Left side navigation menu
- **FaceCamera.jsx** - Camera component for face capture
- **Loader.jsx** - Loading spinner
- **Toast.jsx** - Notification messages
- **ConfirmDialog.jsx** - Confirmation popup
- **PrivateRoute.jsx** - Protects pages (requires login)
- **ErrorBoundary.jsx** - Catches and displays errors

### `src/api/` - Backend Communication
Functions that talk to the backend:
- **axiosClient.js** - HTTP client setup
- **authApi.js** - Login, register API calls
- **userApi.js** - User management API calls
- **classApi.js** - Class API calls
- **studentApi.js** - Student API calls
- **attendanceApi.js** - Attendance API calls
- **reportApi.js** - Report API calls

### `src/ai/` - Face Recognition
Face detection and recognition:
- **faceEngine.js** - Detects faces, computes embeddings
- **liveness.js** - Checks if face is real (not a photo)

### `src/context/` - Global State
React Context for sharing data across components:
- **AuthContext.jsx** - Current user info, login status
- **OfflineContext.jsx** - Online/offline status, sync state

### `src/offline/` - Offline Support
Handles offline functionality:
- **dexie.js** - IndexedDB database setup
- **syncService.js** - Syncs offline data when online

### `src/utils/` - Helper Functions
- **validators.js** - Form validation (email, password, etc.)
- **date.js** - Date formatting utilities
- **jwt.js** - JWT token handling

### `public/face-models/` - AI Models
Face-api.js model files (downloaded separately)

## 🚀 How It Works

1. **User opens app** → `main.jsx` starts React
2. **Routes** → `routes.jsx` determines which page to show
3. **Page loads** → Fetches data from backend via `api/` functions
4. **User interacts** → Components update, send requests to backend
5. **Response** → Updates UI with new data

## 📝 Key Files

- **main.jsx** - React entry point
- **App.jsx** - Main app component
- **routes.jsx** - Defines all page routes
- **index.css** - Global styles
- **package.json** - Lists dependencies

## 🎨 Styling

- **Tailwind CSS** - Utility-first CSS framework
- **tailwind.config.js** - Tailwind configuration
- Custom styles in `index.css`

