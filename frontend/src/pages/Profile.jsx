import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, changePassword } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import Toast from '../components/Toast';
import { validatePassword } from '../utils/validators';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';

const EyeIcon = ({ open, strokeWidth: sw = 1.75, ...props }) => {
  const w = String(sw);
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
        <path
          d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
          stroke="currentColor"
          strokeWidth={w}
          strokeLinejoin="round"
        />
        <path
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          stroke="currentColor"
          strokeWidth={w}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M3 4.5 21 19.5" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
      <path
        d="M10.7 9.2A3 3 0 0 0 12 15a3 3 0 0 0 2.8-1.9"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M6.2 6.7C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7c2 0 3.8-.7 5.3-1.7"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d="M9.6 5.3A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.7 3.7"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
    </svg>
  );
};

const passwordToggleBtnClass =
  'absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200';

const Profile = () => {
  const { user: authUser, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await getProfile();
      setProfile(response.user);
      if (response.user && (response.user.sectionId !== undefined || response.user.department !== undefined)) {
        updateUser({
          sectionId: response.user.sectionId ?? authUser?.sectionId,
          department: response.user.department ?? authUser?.department,
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setToast({ message: err?.error || 'Failed to load profile', type: 'error' });
      // Fallback to auth context user data
      if (authUser) {
        setProfile({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          role: authUser.role,
          institutionName: authUser.institutionName,
          image: authUser.image,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm({ ...passwordForm, [field]: value });
    // Clear error for this field when user types
    if (passwordErrors[field]) {
      setPasswordErrors({ ...passwordErrors, [field]: '' });
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.oldPassword) {
      errors.oldPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (!validatePassword(passwordForm.newPassword)) {
      errors.newPassword = 'Password must be at least 6 characters long';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (passwordForm.oldPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setToast({
        message: 'Password changed successfully. Please login again.',
        type: 'success',
      });
      // Clear form
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      // Logout after a short delay
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Password change error:', err);
      setToast({ message: err?.error || 'Failed to change password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      member: 'bg-blue-100 text-blue-800',
      lecturer: 'bg-blue-100 text-blue-800',
      hr: 'bg-indigo-100 text-indigo-800',
      superadmin: 'bg-pink-100 text-pink-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const displayUser = profile || authUser;

  if (loading && !displayUser) {
    return (
      <DashboardLayout pageTitle="Profile & Settings">
        <div className="flex items-center justify-center py-16">
          <Loader />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Profile & Settings">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader
          title="Profile & Settings"
          subtitle="Manage your account settings and security"
        />

        {/* Profile header card */}
        <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 shrink-0 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold overflow-hidden dark:bg-white dark:text-slate-900">
                {displayUser?.image ? (
                  <img src={displayUser.image} alt={displayUser.name} className="h-full w-full object-cover" />
                ) : (
                  getInitials(displayUser?.name)
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                  {displayUser?.name || 'User'}
                </div>
                <div className="truncate text-sm text-slate-600 dark:text-slate-300/70">
                  {displayUser?.email || 'No email'}
                </div>
                <div className="mt-2">
                  <span className={['inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', getRoleBadgeColor(displayUser?.role)].join(' ')}>
                    {displayUser?.role === 'admin'
                      ? 'Office Admin'
                      : displayUser?.role === 'hr'
                        ? 'Supervisor'
                        : displayUser?.role === 'member'
                          ? 'Lecturer'
                          : displayUser?.role
                            ? displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)
                            : 'User'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            >
              <span aria-hidden="true" className="mr-2 text-[18px] leading-none">🚪</span>
              Logout
            </button>
          </div>
        </div>

        {/* Profile info card */}
        <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm space-y-4 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[18px] leading-none">👤</span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Profile Info</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">Name</div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{displayUser?.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">Email</div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{displayUser?.email || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">Role</div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                {displayUser?.role === 'member'
                  ? 'Lecturer'
                  : displayUser?.role === 'admin'
                    ? 'Office Admin'
                    : displayUser?.role === 'hr'
                      ? 'Supervisor'
                      : displayUser?.role || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">Institution</div>
              <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{displayUser?.institutionName || 'Not specified'}</div>
            </div>
            {displayUser?.department?.name ? (
              <div className="md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">Department</div>
                <div className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{displayUser.department.name}</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Change password card */}
        <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm space-y-4 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[18px] leading-none">🔒</span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="profile-current-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="profile-current-password"
                    type={showOldPassword ? 'text' : 'password'}
                    value={passwordForm.oldPassword}
                    onChange={(e) => handlePasswordChange('oldPassword', e.target.value)}
                    autoComplete="current-password"
                    className={[
                      'w-full h-11 rounded-lg border py-2 pl-4 pr-11 text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-950/30 dark:text-white dark:border-white/10',
                      passwordErrors.oldPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500',
                    ].join(' ')}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className={passwordToggleBtnClass}
                    onClick={() => setShowOldPassword((s) => !s)}
                    aria-label={showOldPassword ? 'Hide current password' : 'Show current password'}
                    aria-pressed={showOldPassword}
                    title={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showOldPassword} className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
                {passwordErrors.oldPassword ? (
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{passwordErrors.oldPassword}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="profile-new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="profile-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    autoComplete="new-password"
                    className={[
                      'w-full h-11 rounded-lg border py-2 pl-4 pr-11 text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-950/30 dark:text-white dark:border-white/10',
                      passwordErrors.newPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500',
                    ].join(' ')}
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    className={passwordToggleBtnClass}
                    onClick={() => setShowNewPassword((s) => !s)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    aria-pressed={showNewPassword}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showNewPassword} className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
                {passwordErrors.newPassword ? (
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{passwordErrors.newPassword}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="profile-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                    className={[
                      'w-full h-11 rounded-lg border py-2 pl-4 pr-11 text-slate-900 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-950/30 dark:text-white dark:border-white/10',
                      passwordErrors.confirmPassword ? 'border-rose-500 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500',
                    ].join(' ')}
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    className={passwordToggleBtnClass}
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showConfirmPassword} className="h-5 w-5" strokeWidth={1.8} />
                  </button>
                </div>
                {passwordErrors.confirmPassword ? (
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{passwordErrors.confirmPassword}</p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {changingPassword ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Account actions */}
        <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm space-y-4 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[18px] leading-none">⚠️</span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Account Actions</h2>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
            <div className="font-semibold">Security notice</div>
            <div className="mt-1 text-amber-800/90 dark:text-amber-200/80">
              After changing your password, you will be automatically logged out and need to login again with your new password.
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700"
          >
            <span aria-hidden="true" className="mr-2 text-[18px] leading-none">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

