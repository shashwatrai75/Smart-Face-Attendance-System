import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { getSummary, getClassWiseData, getTrendData, exportReport, getSections } from '../api/api';
import { formatDate, getToday, getFirstOfMonth, getDateDaysAgo } from '../utils/date';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import ChartSkeleton from '../components/analytics/ChartSkeleton';
import { useAuth } from '../context/AuthContext';

const AttendanceLineChartCard = lazy(() => import('../components/analytics/charts/AttendanceLineChartCard'));
const ClassBarChartCard = lazy(() => import('../components/analytics/charts/ClassBarChartCard'));

const emptySummary = {
  totalSections: 0,
  totalStudents: 0,
  averageAttendance: 0,
  totalSessions: 0,
  totalAttendanceRecords: 0,
};

const Reports = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [classWiseData, setClassWiseData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [exporting, setExporting] = useState(false);
  const fetchSeqRef = useRef(0);
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    startDate: getFirstOfMonth(),
    endDate: getToday(),
  });

  useEffect(() => {
    fetchSections();
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      setSections(response.sections || []);
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const buildParams = (f) => {
    const params = {};
    if (f.sectionId) params.sectionId = f.sectionId;
    else if (f.classId) params.classId = f.classId;
    if (f.startDate) params.startDate = f.startDate;
    if (f.endDate) params.endDate = f.endDate;
    return params;
  };

  const fetchReportData = async (f = filters) => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const params = buildParams(f);
      const [summaryRes, classRes, trendRes] = await Promise.all([
        getSummary(params),
        getClassWiseData(params),
        getTrendData(params),
      ]);

      if (seq !== fetchSeqRef.current) return;

      setSummary(summaryRes.summary || emptySummary);
      setClassWiseData(classRes.classWiseData || []);
      setTrendData(trendRes.trendData || []);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error('Failed to load report data:', err);
      const msg =
        err?.error ||
        err?.message ||
        (typeof err === 'string' ? err : null) ||
        'Failed to load reports (check network / API URL)';
      setToast({ message: msg, type: 'error' });
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyDatePreset = (startDate, endDate) => {
    const next = { ...filters, startDate, endDate };
    setFilters(next);
    fetchReportData(next);
  };

  const handleGenerateReport = () => {
    fetchReportData();
  };

  const handleExport = async (format) => {
    if (!filters.sectionId) {
      setToast({ message: 'Choose a section to export (exports are per section)', type: 'error' });
      return;
    }

    setExporting(true);
    try {
      await exportReport(
        filters.sectionId,
        filters.startDate || undefined,
        filters.endDate || undefined,
        format
      );
      setToast({
        message: `Report exported successfully as ${format.toUpperCase()}`,
        type: 'success',
      });
    } catch (err) {
      setToast({ message: err?.error || 'Failed to export report', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const chartData = useMemo(
    () =>
      (classWiseData || []).map((item) => ({
        ...item,
        sectionName: item.sectionName || item.className || 'Section',
      })),
    [classWiseData]
  );

  const classes = useMemo(
    () =>
      (sections || [])
        .filter((s) => s.sectionType === 'class' && !s.parentSectionId)
        .map((s) => ({ id: s._id || s.id, name: s.sectionName })),
    [sections]
  );

  const childrenOf = (parentId) =>
    (sections || []).filter(
      (s) => s.parentSectionId && String(s.parentSectionId?._id || s.parentSectionId) === String(parentId)
    );

  const availableSections = useMemo(() => {
    if (!filters.classId) return sections || [];
    return childrenOf(filters.classId);
  }, [sections, filters.classId]);

  const formatX = (value) => formatDate(value);

  const onClassChange = (classId) => {
    setFilters((prev) => ({
      ...prev,
      classId,
      sectionId: classId ? '' : prev.sectionId,
    }));
  };

  const showEmptyHint =
    !loading &&
    summary.totalStudents === 0 &&
    summary.totalAttendanceRecords === 0 &&
    (classWiseData || []).length === 0;

  const showNoMarksInRange =
    !loading &&
    summary.totalStudents > 0 &&
    summary.totalAttendanceRecords === 0;

  return (
    <DashboardLayout pageTitle="Attendance reports">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Attendance reports
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              For <strong>today</strong>, tap <strong>Today</strong> below (or set From and To to the same day), choose your
              class/section if needed, then <strong>Load report</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateReport}
              aria-busy={loading}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 aria-busy:opacity-90"
            >
              {loading ? 'Loading…' : 'Load report'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={exporting || !filters.sectionId}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
            >
              {exporting ? 'Exporting…' : 'Export XLSX'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting || !filters.sectionId}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div className="relative z-[1] rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                  Class
                </label>
                <select
                  value={filters.classId}
                  onChange={(e) => onClassChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                >
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                  Section
                </label>
                <select
                  value={filters.sectionId}
                  onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                >
                  <option value="">All sections in scope</option>
                  {availableSections.map((sec) => (
                    <option key={sec._id || sec.id} value={sec._id || sec.id}>
                      {sec.sectionName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                  From
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                  To
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const day = getToday();
                  applyDatePreset(day, day);
                }}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100 dark:hover:bg-indigo-500/25"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(getFirstOfMonth(), getToday())}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(getDateDaysAgo(29), getToday())}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('', '')}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                All dates
              </button>
            </div>
          </div>
        </div>

        {showEmptyHint && (
          <div
            className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            role="status"
          >
            {user?.role === 'member' ? (
              <p>
                No students or attendance in your assigned sections for this range. Tap <strong>Today</strong> if you
                marked attendance today, pick the right <strong>class/section</strong>, then <strong>Load report</strong>.
                If it stays empty, ask an admin to assign you to class sessions, or try <strong>All dates</strong>.
              </p>
            ) : (
              <p>
                No data for these filters. Try <strong>All dates</strong>, confirm students and sections exist, and
                ensure attendance was recorded in that period.
              </p>
            )}
          </div>
        )}

        {showNoMarksInRange && !showEmptyHint && (
          <div
            className="rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100"
            role="status"
          >
            <p>
              There are students in scope, but no attendance marks in this date range. Use <strong>All dates</strong>{' '}
              or adjust From / To, then <strong>Load report</strong>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Students" value={summary.totalStudents} tone="primary" />
          <StatCard
            label="Attendance marks"
            value={summary.totalAttendanceRecords ?? 0}
            tone="success"
          />
          <StatCard
            label="Avg attendance"
            value={`${Number(summary.averageAttendance || 0).toFixed(1)}%`}
            tone="primary"
          />
          <StatCard label="Sessions" value={summary.totalSessions} tone="warning" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Suspense fallback={<ChartSkeleton height={280} />}>
            <AttendanceLineChartCard data={trendData} formatX={formatX} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton height={280} />}>
            <ClassBarChartCard data={chartData} />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
