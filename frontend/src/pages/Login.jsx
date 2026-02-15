import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validators';
import Toast from '../components/Toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const userRole = user.role;
      if (userRole === 'admin' || userRole === 'superadmin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'lecturer') {
        navigate('/lecturer/dashboard', { replace: true });
      } else {
        navigate('/viewer/history', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login with:', { email, passwordLength: password.length });
      const response = await loginAPI(email, password);
      console.log('Login response:', response); // Debug log

      // Handle response - axios interceptor already unwraps response.data
      if (response && response.token && response.user) {
        console.log('Login successful, saving token and user data');

        // Ensure user object has all required fields
        const userData = {
          id: response.user.id || response.user._id,
          name: response.user.name || 'User',
          email: response.user.email || '',
          role: response.user.role || 'viewer',
          institutionName: response.user.institutionName || '',
        };

        console.log('Processed user data:', userData);
        login(response.token, userData);

        const userRole = response.user.role;
        console.log('User role:', userRole);

        // Small delay to ensure state is saved before navigation
        setTimeout(() => {
          if (userRole === 'admin' || userRole === 'superadmin') {
            console.log('Redirecting to admin dashboard');
            navigate('/admin/dashboard', { replace: true });
          } else if (userRole === 'lecturer') {
            console.log('Redirecting to lecturer dashboard');
            navigate('/lecturer/dashboard', { replace: true });
          } else {
            console.log('Redirecting to viewer history');
            navigate('/viewer/history', { replace: true });
          }
        }, 100);
      } else {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error details:', err); // Debug log
      console.error('Error type:', typeof err);
      console.error('Error keys:', Object.keys(err || {}));

      // Handle different error formats
      let errorMessage = 'Login failed. Please try again.';

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.error) {
        errorMessage = err.error;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      // Check for network errors
      if (err?.message?.includes('Network Error') || err?.message?.includes('Failed to fetch') || err?.error === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

      // Check for MongoDB timeout errors
      if (err?.error?.includes('buffering timed out') || err?.error?.includes('MongoDB')) {
        errorMessage = 'Database connection timeout. Please check MongoDB Atlas IP whitelist and connection string.';
      }

      setError(errorMessage);
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="glass-effect p-10 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:scale-105">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-white text-3xl font-bold">SF</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            SmartFace Attendance
          </h2>
          <p className="text-gray-600">Welcome back! Please login to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="text-2xl">{showPassword ? '👁️' : '🙈'}</span>
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

