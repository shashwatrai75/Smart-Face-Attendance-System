import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validators';
import Toast from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import PropTypes from 'prop-types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300';

function FormSection({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm dark:border dark:border-slate-700/80 dark:bg-slate-900">
      <div className="border-b border-slate-100 pb-3 dark:border-slate-700/80">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

FormSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node,
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    dateOfBirth: '',
    gender: '',
    role: 'member',
    institutionName: '',
    image: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const isSuperadmin =
    currentUser?.role === 'superadmin' ||
    (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}')?.role === 'superadmin');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await createUser(formData);
      setToast({ message: 'User created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      setError(err.error || 'Failed to create user');
      setToast({ message: err.error || 'Failed to create user', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          <div className="mx-auto w-full max-w-4xl space-y-6">
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create New User</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Add a team member with profile, address, and account access. Required fields are marked with{' '}
                <span className="text-red-500">*</span>.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FormSection
                title="Personal Information"
                description="Basic identity details for the new account."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                      placeholder="e.g. Jane Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                      placeholder="name@organization.com"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date of birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Address Information" description="Optional mailing or contact address.">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Street address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                      placeholder="123 Main Street, Apt 4"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className={`${inputClass} mt-1.5`}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>State / Province</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className={`${inputClass} mt-1.5`}
                        placeholder="State or region"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ZIP / Postal code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className={`${inputClass} mt-1.5`}
                        placeholder="12345"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Account Information"
                description="Credentials, role, optional photo, and institution."
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Profile photo (optional)</label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Square image works best. Maximum file size 2&nbsp;MB. JPG or PNG.
                    </p>
                    <div className="mt-3 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center dark:border-slate-600 dark:bg-slate-800/50">
                      <div className="flex shrink-0 justify-center sm:justify-start">
                        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white shadow-inner dark:border-slate-500 dark:bg-slate-800">
                          {formData.image ? (
                            <img src={formData.image} alt="Profile preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                              No photo
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <input
                          id="register-profile-photo"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                setToast({ message: 'File size should be less than 2MB', type: 'error' });
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, image: reader.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <label
                            htmlFor="register-profile-photo"
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md"
                          >
                            Choose image
                          </label>
                          {formData.image ? (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, image: '' })}
                              className="text-sm font-semibold text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Remove photo
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`${inputClass} pr-[4.5rem]`}
                        placeholder="At least 6 characters"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="member">Member</option>
                      {isSuperadmin && (
                        <>
                          <option value="admin">Office Admin</option>
                          <option value="hr">Supervisor</option>
                          <option value="superadmin">Superadmin</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Institution name (optional)</label>
                    <input
                      type="text"
                      value={formData.institutionName}
                      onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                      className={`${inputClass} mt-1.5`}
                      placeholder="School or organization name"
                    />
                  </div>
                </div>
              </FormSection>

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </div>
              ) : null}

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-violet-700 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
                >
                  {loading ? 'Creating…' : 'Create user'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Register;
