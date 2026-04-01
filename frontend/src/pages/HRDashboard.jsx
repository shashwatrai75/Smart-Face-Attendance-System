import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCheckInHistory, getSectionById } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getToday } from '../utils/date';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';

const DepartmentBadge = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
    {name}
  </span>
);

const HRDashboard = () => {
  const { user } = useAuth();
  const departmentName = user?.department?.name || null;
  const departmentSectionId = user?.sectionId || null;

  const [loadingStats, setLoadingStats] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(null);
  const [presentToday, setPresentToday] = useState(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoadingStats(true);
      try {
        if (!departmentSectionId) {
          if (!alive) return;
          setTotalEmployees(null);
          setPresentToday(null);
          return;
        }

        const today = getToday();
        const [secRes, histRes] = await Promise.all([
          getSectionById(departmentSectionId),
          getCheckInHistory({ sectionId: departmentSectionId, dateFrom: today, dateTo: today }),
        ]);

        const members = Array.isArray(secRes?.section?.members) ? secRes.section.members : [];
        const records = Array.isArray(histRes?.records) ? histRes.records : [];

        if (!alive) return;
        setTotalEmployees(members.length);

        // Unique users who checked in (or out) today
        const uniq = new Set(records.map((r) => String(r.userId?._id || r.userId || '')));
        uniq.delete('');
        setPresentToday(uniq.size);
      } catch {
        if (!alive) return;
        setTotalEmployees(null);
        setPresentToday(null);
      } finally {
        if (!alive) return;
        setLoadingStats(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [departmentSectionId]);

  const absentToday = useMemo(() => {
    if (typeof totalEmployees !== 'number' || typeof presentToday !== 'number') return null;
    return Math.max(0, totalEmployees - presentToday);
  }, [totalEmployees, presentToday]);

  const FeatureIcon = ({ tone, children }) => {
    const toneCls =
      tone === 'blue'
        ? 'bg-blue-500/10 text-blue-700 ring-blue-600/15 dark:bg-blue-400/10 dark:text-blue-200 dark:ring-blue-300/15'
        : tone === 'purple'
          ? 'bg-purple-500/10 text-purple-700 ring-purple-600/15 dark:bg-purple-400/10 dark:text-purple-200 dark:ring-purple-300/15'
          : tone === 'green'
            ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/15'
            : tone === 'orange'
              ? 'bg-amber-500/10 text-amber-800 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/15'
              : 'bg-pink-500/10 text-pink-700 ring-pink-600/15 dark:bg-pink-400/10 dark:text-pink-200 dark:ring-pink-300/15';
    return (
      <div className={['flex h-12 w-12 items-center justify-center rounded-2xl ring-1', toneCls].join(' ')}>
        {children}
      </div>
    );
  };

  const StatMini = ({ label, value, tone }) => {
    const toneCls =
      tone === 'green'
        ? 'text-emerald-700 dark:text-emerald-200'
        : tone === 'red'
          ? 'text-rose-700 dark:text-rose-200'
          : 'text-indigo-700 dark:text-indigo-200';
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">
          {label}
        </div>
        <div className={['mt-2 text-2xl font-semibold tracking-tight', toneCls].join(' ')}>
          {loadingStats ? '—' : value ?? '—'}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout pageTitle="Supervisor Dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Supervisor Dashboard"
          subtitle="Manage employees and track attendance"
          actions={departmentName ? <DepartmentBadge name={departmentName} /> : null}
        />

        {/* Optional stats row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatMini label="Total Employees" value={totalEmployees} tone="indigo" />
          <StatMini label="Present Today" value={presentToday} tone="green" />
          <StatMini label="Absent Today" value={absentToday} tone="red" />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 auto-rows-fr">
          <Link
            to="/hr/enroll-employee"
            className="group flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40"
          >
            <div className="flex items-start justify-between gap-4">
              <FeatureIcon tone="blue">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </FeatureIcon>
              <span className="text-slate-300 group-hover:text-slate-400 dark:text-slate-500">→</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Enroll Employee</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Register new employees with face capture.
            </div>
          </Link>

          <Link
            to="/hr/face-scan"
            className="group flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40"
          >
            <div className="flex items-start justify-between gap-4">
              <FeatureIcon tone="purple">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7V6a2 2 0 0 1 2-2h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M20 7V6a2 2 0 0 0-2-2h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M4 17v1a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M20 17v1a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M9.5 10.5c.7-.8 1.6-1.2 2.5-1.2s1.8.4 2.5 1.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M10.2 14.6c.5.6 1.1.9 1.8.9s1.3-.3 1.8-.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </FeatureIcon>
              <span className="text-slate-300 group-hover:text-slate-400 dark:text-slate-500">→</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Employee Face Scan</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Add or update face data for department members.
            </div>
          </Link>

          <Link
            to="/hr/attendance"
            className="group flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40"
          >
            <div className="flex items-start justify-between gap-4">
              <FeatureIcon tone="green">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M16 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </FeatureIcon>
              <span className="text-slate-300 group-hover:text-slate-400 dark:text-slate-500">→</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Live Attendance</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Face-based check-in for departments, with live feed.
            </div>
          </Link>

          <Link
            to="/hr/history"
            className="group flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40"
          >
            <div className="flex items-start justify-between gap-4">
              <FeatureIcon tone="orange">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 0 3-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M4 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </FeatureIcon>
              <span className="text-slate-300 group-hover:text-slate-400 dark:text-slate-500">→</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">History</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Review check-in and attendance history by date.
            </div>
          </Link>

          <Link
            to="/hr/reports"
            className="group flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40"
          >
            <div className="flex items-start justify-between gap-4">
              <FeatureIcon tone="pink">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 17V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 17V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M17 17v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M5 21h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </FeatureIcon>
              <span className="text-slate-300 group-hover:text-slate-400 dark:text-slate-500">→</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Reports</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Export summaries and performance reports.
            </div>
          </Link>
        </div>

        {!departmentSectionId ? (
          <div className="w-full rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300/70">
            No department is assigned to this supervisor yet. Ask the admin to link your account to a department for employee stats.
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
