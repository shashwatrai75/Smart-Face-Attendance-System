import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  // Add timeout for loading state to prevent infinite loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen page-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('PrivateRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user has a role, if not try to get it from localStorage
  let userWithRole = user;
  if (!user.role) {
    console.warn('PrivateRoute: User object missing role property:', user);
    try {
      const storedUserStr = localStorage.getItem('user');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser && storedUser.role) {
          userWithRole = { ...user, role: storedUser.role };
          console.log('PrivateRoute: Restored role from localStorage:', userWithRole.role);
        } else {
          console.error('PrivateRoute: No role found in user object or localStorage, redirecting to login');
          return <Navigate to="/login" replace />;
        }
      } else {
        console.error('PrivateRoute: No user data in localStorage, redirecting to login');
        return <Navigate to="/login" replace />;
      }
    } catch (err) {
      console.error('PrivateRoute: Error parsing user data:', err);
      return <Navigate to="/login" replace />;
    }
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userWithRole.role)) {
    console.log('PrivateRoute: User role not allowed, redirecting');
    const role = userWithRole.role;
    if (role === 'superadmin') return <Navigate to="/superadmin/system-settings" replace />;
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    if (role === 'lecturer') return <Navigate to="/lecturer/dashboard" replace />;
    return <Navigate to="/lecturer/dashboard" replace />;
  }

  console.log('PrivateRoute: Rendering children');
  return children;
};

export default PrivateRoute;

