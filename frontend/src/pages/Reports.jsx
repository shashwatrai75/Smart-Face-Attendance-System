import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { getSummary, getClassWiseData, getTrendData, exportReport, getSections } from '../api/api';
import { formatDate } from '../utils/date';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import ChartSkeleton from '../components/analytics/ChartSkeleton';

const AttendanceLineChartCard = lazy(() => import('../components/analytics/charts/AttendanceLineChartCard'));
const StatusDonutChartCard = lazy(() => import('../components/analytics/charts/StatusDonutChartCard'));
const ClassBarChartCard = lazy(() => import('../components/analytics/charts/ClassBarChartCard'));
const WeeklyAreaChartCard = lazy(() => import('../components/analytics/charts/WeeklyAreaChartCard'));

const Reports = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [summary, setSummary] = useState({
    totalSections: 0,
    totalStudents: 0,
    averageAttendance: 0,
    totalSessions: 0,
  });
  const [classWiseData, setClassWiseData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchSections();
    fetchAllData();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      const all = response.sections || [];
      // Include all sections (class and department)
      setSections(all);
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.sectionId) params.sectionId = filters.sectionId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [summaryRes, classRes, trendRes] = await Promise.all([
        getSummary(params),
        getClassWiseData(params),
        getTrendData(params),
      ]);

      setSummary(summaryRes.summary || summary);
      setClassWiseData(classRes.classWiseData || []);
      setTrendData(trendRes.trendData || []);
    } catch (err) {
      console.error('Failed to load report data:', err);
      setToast({ message: err?.error || 'Failed to load reports', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = () => {
    fetchAllData();
  };

  const handleExport = async (format) => {
    if (!filters.sectionId) {
      setToast({ message: 'Please select a section to export', type: 'error' });
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const getPieChartData = () => {
    const present = classWiseData.reduce((sum, item) => sum + item.presentCount, 0);
    const absent = classWiseData.reduce((sum, item) => sum + item.absentCount, 0);
    const late = classWiseData.reduce((sum, item) => sum + item.lateCount, 0);

    return [
      { name: 'Present', value: present, color: '#22c55e' },
      { name: 'Absent', value: absent, color: '#ef4444' },
      { name: 'Late', value: late, color: '#f59e0b' },
    ].filter((item) => item.value > 0);
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

  const attendanceToday = useMemo(() => {
    const latest = (trendData || []).slice(-1)[0];
    if (!latest) return 0;
    const present = Number(latest.present || 0);
    const absent = Number(latest.absent || 0);
    const late = Number(latest.late || 0);
    return present + absent + late;
  }, [trendData]);

  const absentCount = useMemo(() => {
    const latest = (trendData || []).slice(-1)[0];
    return Number(latest?.absent || 0);
  }, [trendData]);

  const attendanceRate = useMemo(() => {
    const latest = (trendData || []).slice(-1)[0];
    const pct = Number(latest?.attendancePercentage || 0);
    return Number.isFinite(pct) ? pct : 0;
  }, [trendData]);

  const formatX = (value) => formatDate(value);

  const onClassChange = (classId) => {
    setFilters((prev) => ({
      ...prev,
      classId,
      sectionId: classId ? '' : prev.sectionId,
    }));
  };

  return (
    <DashboardLayout pageTitle="Attendance Analytics">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-8">
        {/* Header + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Attendance Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              Clean, interactive insights across classes, sections, and date ranges.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading…' : 'Apply Filters'}
            </button>
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={loading || !filters.sectionId}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
              title="Export Excel"
            >
              Export XLSX
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={loading || !filters.sectionId}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
              title="Export CSV"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Filters</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300/70">
            Narrow analytics by date range, class, and section.
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                Class
              </label>
              <select
                value={filters.classId}
                onChange={(e) => onClassChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">
                Section
              </label>
              <select
                value={filters.sectionId}
                onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              >
                <option value="">All Sections</option>
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total Students" value={summary.totalStudents} tone="primary" trend={{ value: 3, label: 'vs last week' }} />
          <StatCard label="Attendance Today" value={attendanceToday} tone="success" trend={{ value: 5, label: 'vs yesterday' }} />
          <StatCard label="Attendance Rate" value={`${attendanceRate.toFixed(1)}%`} tone="primary" trend={{ value: 2, label: 'vs last week' }} />
          <StatCard label="Absent Count" value={absentCount} tone="danger" trend={{ value: -1, label: 'vs yesterday' }} />
          <StatCard label="Total Sections" value={summary.totalSections} tone="warning" trend={{ value: 1, label: 'vs last week' }} />
          <StatCard label="Sessions" value={summary.totalSessions} tone="primary" trend={{ value: 4, label: 'vs last month' }} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<ChartSkeleton height={280} />}>
            <div className="md:col-span-2 lg:col-span-2">
              <AttendanceLineChartCard data={trendData} formatX={formatX} />
            </div>
          </Suspense>

          <Suspense fallback={<ChartSkeleton height={280} />}>
            <StatusDonutChartCard data={getPieChartData()} />
          </Suspense>

          <Suspense fallback={<ChartSkeleton height={280} />}>
            <div className="md:col-span-2 lg:col-span-2">
              <ClassBarChartCard data={chartData} />
            </div>
          </Suspense>

          <Suspense fallback={<ChartSkeleton height={280} />}>
            <WeeklyAreaChartCard data={trendData} formatX={formatX} />
          </Suspense>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
