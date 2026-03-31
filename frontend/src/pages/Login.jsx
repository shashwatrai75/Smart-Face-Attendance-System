import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validators';
import Toast from '../components/Toast';

const EmailIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M4 6.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="m4.5 8 6.8 5.2a1.2 1.2 0 0 0 1.4 0L19.5 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const LockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M7.5 11V8.8a4.5 4.5 0 0 1 9 0V11"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M6.5 11h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const FaceIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M8 3h8a2 2 0 0 1 2 2v1.5M8 3a2 2 0 0 0-2 2v1.5M8 21h8a2 2 0 0 0 2-2v-1.5M8 21a2 2 0 0 1-2-2v-1.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M9 11.2c.9-1 2-1.5 3-1.5s2.1.5 3 1.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M9.4 14.9c.7.8 1.6 1.2 2.6 1.2s1.9-.4 2.6-1.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M9 12.5h.01M15 12.5h.01"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

const EyeIcon = ({ open, ...props }) => {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
        <path
          d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3 4.5 21 19.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.7 9.2A3 3 0 0 0 12 15a3 3 0 0 0 2.8-1.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.7C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7c2 0 3.8-.7 5.3-1.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9.6 5.3A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.7 3.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
};

const getDashboardPath = (role) => {
  if (role === 'superadmin') return '/superadmin/system-settings';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hr') return '/hr/dashboard';
  if (role === 'member') return '/member/dashboard';
  return '/admin/dashboard';
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(getDashboardPath(user.role), { replace: true });
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
      const response = await loginAPI(email, password);

      if (response && response.token && response.user) {
        const userData = {
          id: response.user.id || response.user._id,
          name: response.user.name || 'User',
          email: response.user.email || '',
          role: response.user.role || 'member',
          institutionName: response.user.institutionName || '',
          linkedStudentId: response.user.linkedStudentId || null,
          sectionId: response.user.sectionId || null,
          department: response.user.department || null,
        };

        login(response.token, userData);

        setTimeout(() => {
          navigate(getDashboardPath(userData.role), { replace: true });
        }, 100);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
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

      if (err?.message?.includes('Network Error') || err?.message?.includes('Failed to fetch') || err?.error === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-[560px] w-[560px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_30%,rgba(255,255,255,0.09),transparent_65%)]" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-lg auth-card-fade">
        <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-indigo-500/25 to-fuchsia-500/20 border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_50px_rgba(99,102,241,0.25)] flex items-center justify-center">
                <div className="h-9 w-9 text-cyan-100/95">
                  <FaceIcon className="h-full w-full" />
                </div>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                SmartFace Attendance
              </h2>
              <p className="mt-2 text-sm text-white/70">
                AI Powered Attendance System
              </p>
            </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
                <EmailIcon className="h-5 w-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-11 py-3 text-white placeholder:text-white/35 outline-none transition-all duration-200 focus:border-purple-300/40 focus:ring-2 focus:ring-purple-400/60"
                placeholder="name@company.com"
                required
                autoComplete={rememberMe ? 'email' : 'off'}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
                <LockIcon className="h-5 w-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-11 py-3 pr-12 text-white placeholder:text-white/35 outline-none transition-all duration-200 focus:border-purple-300/40 focus:ring-2 focus:ring-purple-400/60"
                placeholder="Enter your password"
                required
                autoComplete={rememberMe ? 'current-password' : 'off'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/50 hover:text-white/80 hover:bg-white/10 focus:outline-none transition-colors duration-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-white/75 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-2 focus:ring-purple-400/70"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setToast({ message: 'Forgot password flow coming soon.', type: 'info' })}
              className="text-sm font-medium text-purple-200/90 hover:text-purple-100 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4">
              <p className="text-red-100/90 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 py-3 text-white shadow-[0_18px_40px_rgba(99,102,241,0.35)] transition-all duration-200 font-semibold text-base hover:shadow-[0_22px_55px_rgba(147,51,234,0.35)] hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setToast({ message: 'Face login will be added next.', type: 'info' })}
              className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-white/90 transition-all duration-200 font-semibold text-base hover:bg-white/10 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Scan Face to Login
            </button>
          </div>
        </form>

            <div className="mt-7 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-white/70">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/admin/register')}
                  className="font-semibold text-purple-200/90 hover:text-purple-100 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
