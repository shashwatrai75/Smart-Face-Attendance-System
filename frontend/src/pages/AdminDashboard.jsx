import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getUsers, getSections } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardCards from '../components/dashboard/admin/DashboardCards';
import ChartsSection from '../components/dashboard/admin/ChartsSection';
import ActivityPanel from '../components/dashboard/admin/ActivityPanel';
import SystemStatusCard from '../components/dashboard/admin/SystemStatusCard';
import UsersTable from '../components/dashboard/admin/UsersTable';
import DashboardQuickActions from '../components/dashboard/admin/DashboardQuickActions';

const defaultStats = {
  totalUsers: 0,
  activeMembers: 0,
  totalSections: 0,
  totalStudents: 0,
  totalAttendance: 0,
  todayAttendance: 0,
  verifiedUsers: 0,
  usersWithRecentLogin: 0,
  newUsersThisMonth: 0,
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const dashboardTitle =
    user?.role === 'superadmin' ? 'Superadmin Dashboard' : 'Office Admin Dashboard';
  const dashboardSubtitle =
    user?.role === 'superadmin'
      ? 'Institution-wide health, attendance signals, and superadmin shortcuts—aligned with platform control.'
      : 'System health, attendance signals, and shortcuts—organized for daily operations.';

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [statsR, usersR, sectionsR] = await Promise.allSettled([
          getStats(),
          getUsers(),
          getSections(),
        ]);

        if (statsR.status === 'fulfilled' && statsR.value?.stats) {
          setStats({ ...defaultStats, ...statsR.value.stats });
        } else {
          setStats(defaultStats);
          setLoadError(true);
          setToast({ message: 'Failed to load dashboard stats', type: 'error' });
        }

        if (usersR.status === 'fulfilled' && Array.isArray(usersR.value?.users)) {
          setUsers(usersR.value.users);
        } else {
          setUsers([]);
        }

        if (sectionsR.status === 'fulfilled' && Array.isArray(sectionsR.value?.sections)) {
          setSections(sectionsR.value.sections);
        } else {
          setSections([]);
        }
      } catch {
        setStats(defaultStats);
        setLoadError(true);
        setToast({ message: 'Failed to load dashboard', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout pageTitle={dashboardTitle}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full space-y-10 animate-dashboard-in motion-reduce:animate-none motion-reduce:opacity-100">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {dashboardTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-slate-300">
              {dashboardSubtitle}
            </p>
          </div>
          <Link
            to="/admin/sections"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400/50"
          >
            Create section
          </Link>
        </header>

        <section className="space-y-4 animate-dashboard-in-delay motion-reduce:animate-none motion-reduce:opacity-100">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Stats overview</h2>
            <span className="text-sm text-gray-500 dark:text-slate-400">Updated with your latest sync</span>
          </div>
          <DashboardCards loading={loading} stats={stats} />
        </section>

        <div className="space-y-10 animate-dashboard-in-delay-2 motion-reduce:animate-none motion-reduce:opacity-100">
          <DashboardQuickActions />

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Analytics</h2>
            <ChartsSection loading={loading} stats={stats} sections={sections} />
          </section>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,440px)]">
            <div className="min-w-0 space-y-8">
              <UsersTable loading={loading} users={users} />
            </div>
            <aside className="flex min-w-0 flex-col gap-8">
              <ActivityPanel loading={loading} stats={stats} />
              <SystemStatusCard loading={loading} stats={stats} loadError={loadError} />
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
