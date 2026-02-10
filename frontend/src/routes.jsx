import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import ClassManagement from './pages/ClassManagement';
import StudentEnrollment from './pages/StudentEnrollment';
import LecturerDashboard from './pages/LecturerDashboard';
import LiveAttendance from './pages/LiveAttendance';
import AttendanceHistory from './pages/AttendanceHistory';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/register"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Register />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/classes"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <ClassManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <PrivateRoute allowedRoles={['teacher', 'lecturer']}>
            <LecturerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/enroll"
        element={
          <PrivateRoute allowedRoles={['teacher', 'lecturer', 'admin']}>
            <StudentEnrollment />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/attendance"
        element={
          <PrivateRoute allowedRoles={['teacher', 'lecturer']}>
            <LiveAttendance />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/history"
        element={
          <PrivateRoute allowedRoles={['teacher', 'lecturer', 'admin']}>
            <AttendanceHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/teacher/reports"
        element={
          <PrivateRoute allowedRoles={['teacher', 'lecturer', 'admin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/history"
        element={
          <PrivateRoute allowedRoles={['viewer', 'teacher', 'lecturer', 'admin']}>
            <AttendanceHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/reports"
        element={
          <PrivateRoute allowedRoles={['viewer', 'teacher', 'lecturer', 'admin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['admin', 'teacher', 'lecturer', 'viewer']}>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

