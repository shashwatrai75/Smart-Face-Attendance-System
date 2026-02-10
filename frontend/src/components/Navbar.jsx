import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  let isOnline = true;
  let isSyncing = false;
  
  try {
    const offline = useOffline();
    isOnline = offline?.isOnline ?? true;
    isSyncing = offline?.isSyncing ?? false;
  } catch (error) {
    // Fallback if offline context not available
    console.warn('Offline context not available:', error);
  }
  
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-effect shadow-lg px-6 py-4 flex justify-between items-center border-b border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-white text-xl font-bold">SF</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SmartFace Attendance
          </h1>
        </div>
        <div className="flex items-center gap-3 ml-6">
          {isOnline ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-green-700 text-sm font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-red-700 text-sm font-medium">Offline</span>
            </div>
          )}
          {isSyncing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-700 text-sm font-medium">Syncing...</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-gray-800 font-semibold text-sm">{user?.name}</span>
            <span className="text-gray-500 text-xs capitalize">{user?.role}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

