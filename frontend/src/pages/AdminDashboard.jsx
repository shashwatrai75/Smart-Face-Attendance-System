import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../api/api';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import SkeletonCard from '../components/dashboard/SkeletonCard';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getStats();
      setStats(response.stats || {
        totalUsers: 0,
        activeMembers: 0,
        totalSections: 0,
        totalStudents: 0,
        totalAttendance: 0,
        todayAttendance: 0,
      });
    } catch (err) {
      setToast({ message: 'Failed to load stats', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, tone: 'primary', trend: { value: 12, label: 'vs last week' } },
    { label: 'Active Members', value: stats?.activeMembers ?? 0, tone: 'success', trend: { value: 4, label: 'vs last week' } },
    { label: 'Total Sections', value: stats?.totalSections ?? 0, tone: 'warning', trend: { value: 1, label: 'vs last week' } },
    { label: 'Total Students', value: stats?.totalStudents ?? 0, tone: 'primary', trend: { value: 6, label: 'vs last week' } },
    { label: 'Total Attendance', value: stats?.totalAttendance ?? 0, tone: 'success', trend: { value: 9, label: 'vs last week' } },
    { label: "Today's Attendance", value: stats?.todayAttendance ?? 0, tone: 'danger', trend: { value: -2, label: 'vs yesterday' } },
  ];

  return (
    <DashboardLayout pageTitle="Office Admin Dashboard">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-8">
        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Office Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Overview of your system health, usage, and attendance activity.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/sections"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400/60"
            >
              Create Section
            </Link>
          </div>
        </div>

        {/* Stats overview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
              Stats Overview
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-300/70">
              Updated just now
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} />)
              : cards.slice(0, 4).map((c) => (
                  <StatCard key={c.label} label={c.label} value={c.value} tone={c.tone} trend={c.trend} />
                ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Link
              to="/admin/sections"
              className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/40"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-700 ring-1 ring-indigo-500/15 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/15">
                  <div className="h-6 w-6 rounded-lg bg-current/10" title="Sections" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900 dark:text-white">Manage Sections</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Create and organize classes and departments.
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                Open →
              </div>
            </Link>

            <Link
              to="/admin/users"
              className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/40"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 ring-1 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/15">
                  <div className="h-6 w-6 rounded-lg bg-current/10" title="Users" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900 dark:text-white">User Management</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Invite users, manage roles, and access.
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                Open →
              </div>
            </Link>

            <Link
              to="/admin/reports"
              className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/40"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-800 ring-1 ring-amber-500/15 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/15">
                  <div className="h-6 w-6 rounded-lg bg-current/10" title="Reports" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900 dark:text-white">Reports</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    Export and review attendance analytics.
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-semibold text-amber-800 dark:text-amber-200">
                Open →
              </div>
            </Link>
          </div>
        </section>

        {/* Recent activity */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
            Recent Activity / Reports
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">System snapshot</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    High-level view of attendance and usage.
                  </div>
                </div>
                <Link to="/admin/history" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
                  View history
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {loading ? (
                  <>
                    <SkeletonCard lines={1} />
                    <SkeletonCard lines={1} />
                  </>
                ) : (
                  <>
                    <StatCard label="Total Attendance" value={cards[4].value} tone={cards[4].tone} trend={cards[4].trend} />
                    <StatCard label="Today's Attendance" value={cards[5].value} tone={cards[5].tone} trend={cards[5].trend} />
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
              <div className="text-base font-semibold text-slate-900 dark:text-white">Activity</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                Latest events in your workspace.
              </div>

              <div className="mt-5 space-y-3">
                {!loading && (!stats || Object.values(stats).every((v) => (typeof v === 'number' ? v === 0 : !v))) ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-300/70">
                    No recent activity yet. Create a section to get started.
                  </div>
                ) : loading ? (
                  <div className="space-y-3">
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      Stats updated successfully
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300/70">Just now</div>
                    </div>
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      Reports ready to export
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300/70">Today</div>
                    </div>
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                      Review attendance history
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300/70">This week</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

