import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/classes', label: 'Classes', icon: '📚' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
  ];

  const teacherLinks = [
    { path: '/teacher/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/teacher/classes', label: 'My Classes', icon: '📚' },
    { path: '/teacher/enroll', label: 'Enroll Students', icon: '➕' },
    { path: '/teacher/attendance', label: 'Live Attendance', icon: '📹' },
    { path: '/teacher/history', label: 'History', icon: '📜' },
    { path: '/teacher/reports', label: 'Reports', icon: '📈' },
  ];

  const viewerLinks = [
    { path: '/viewer/history', label: 'Attendance History', icon: '📜' },
    { path: '/viewer/reports', label: 'Reports', icon: '📈' },
  ];

  // Normalize role: treat "lecturer" as "teacher"
  const userRole = user?.role === 'lecturer' ? 'teacher' : user?.role;

  const links =
    userRole === 'admin'
      ? adminLinks
      : userRole === 'teacher'
      ? teacherLinks
      : viewerLinks;

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white min-h-screen p-6 flex flex-col shadow-2xl">
      <div className="mb-8">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow mb-4">
          <span className="text-white text-2xl font-bold">SF</span>
        </div>
        <h2 className="text-xl font-bold text-white">Navigation</h2>
      </div>
      <nav className="space-y-2 flex-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              isActive(link.path)
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:translate-x-1'
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700">
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            isActive('/profile')
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white hover:translate-x-1'
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="font-medium">Profile</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

