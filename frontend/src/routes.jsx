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
import AttendanceCalendar from './pages/AttendanceCalendar';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/register"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <Register />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/classes"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <ClassManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/calendar"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <AttendanceCalendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/dashboard"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <LecturerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/enroll"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <StudentEnrollment />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/attendance"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <LiveAttendance />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/history"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <AttendanceHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/reports"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/calendar"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <AttendanceCalendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/history"
        element={
          <PrivateRoute allowedRoles={['viewer', 'lecturer', 'admin', 'superadmin']}>
            <AttendanceHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/reports"
        element={
          <PrivateRoute allowedRoles={['viewer', 'lecturer', 'admin', 'superadmin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/calendar"
        element={
          <PrivateRoute allowedRoles={['viewer', 'lecturer', 'admin', 'superadmin']}>
            <AttendanceCalendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin', 'lecturer', 'viewer']}>
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

