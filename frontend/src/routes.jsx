import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import SectionManagement from './pages/SectionManagement';
import SectionDetail from './pages/SectionDetail';
import StudentEnrollment from './pages/StudentEnrollment';
import EnrollEmployee from './pages/EnrollEmployee';
import EmployeeFaceScan from './pages/EmployeeFaceScan';
import HRDashboard from './pages/HRDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import LiveAttendance from './pages/LiveAttendance';
import AttendanceHistory from './pages/AttendanceHistory';
import AttendanceCalendar from './pages/AttendanceCalendar';
import Landing from './pages/Landing';
import About from './pages/About';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import SystemSettings from './pages/superadmin/SystemSettings';
import AdminManagement from './pages/superadmin/AdminManagement';
import AuditLogs from './pages/superadmin/AuditLogs';
import DangerZone from './pages/superadmin/DangerZone';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/superadmin/system-settings" element={<PrivateRoute allowedRoles={['superadmin']}><SystemSettings /></PrivateRoute>} />
      <Route path="/superadmin/admin-management" element={<PrivateRoute allowedRoles={['superadmin']}><AdminManagement /></PrivateRoute>} />
      <Route path="/superadmin/audit-logs" element={<PrivateRoute allowedRoles={['superadmin']}><AuditLogs /></PrivateRoute>} />
      <Route path="/superadmin/danger-zone" element={<PrivateRoute allowedRoles={['superadmin']}><DangerZone /></PrivateRoute>} />
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
        path="/admin/sections"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <SectionManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/sections/:id"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin', 'lecturer']}>
            <SectionDetail />
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
        path="/admin/history"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin']}>
            <AttendanceHistory />
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
        path="/admin/enroll-employee"
        element={
          <PrivateRoute allowedRoles={['superadmin']}>
            <EnrollEmployee />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr/dashboard"
        element={
          <PrivateRoute allowedRoles={['hr', 'superadmin']}>
            <HRDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr/enroll-employee"
        element={
          <PrivateRoute allowedRoles={['hr', 'superadmin']}>
            <EnrollEmployee />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr/face-scan"
        element={
          <PrivateRoute allowedRoles={['hr', 'superadmin']}>
            <EmployeeFaceScan />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr/attendance"
        element={
          <PrivateRoute allowedRoles={['hr', 'superadmin']}>
            <LiveAttendance />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr/history"
        element={
          <PrivateRoute allowedRoles={['hr', 'superadmin']}>
            <AttendanceHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/hr/reports"
        element={
          <PrivateRoute allowedRoles={['hr', 'superadmin']}>
            <Reports />
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
        path="/lecturer/sections"
        element={<Navigate to="/lecturer/dashboard" replace />}
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
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <AttendanceHistory />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/reports"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/viewer/calendar"
        element={
          <PrivateRoute allowedRoles={['lecturer', 'admin', 'superadmin']}>
            <AttendanceCalendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['admin', 'superadmin', 'lecturer', 'hr']}>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

