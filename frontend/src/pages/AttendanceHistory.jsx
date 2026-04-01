import { useMemo, useState, useEffect } from 'react';
import { getSessionHistory, getSessionDetails, getSections, notifyAbsentTodaySMS, getCheckInHistory } from '../api/api';
import { formatDate, formatDateTime, getToday, getFirstOfMonth } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';
import AttendanceSectionCard from '../components/attendanceHistory/AttendanceSectionCard';
import HistorySkeleton from '../components/attendanceHistory/HistorySkeleton';
import StatusPill from '../components/attendanceHistory/StatusPill';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const canViewTeacherAttendance = user?.role === 'superadmin' || user?.role === 'admin';
  const [sessions, setSessions] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('student'); // student | teacher
  const [filters, setFilters] = useState({
    sectionId: '',
    startDate: getFirstOfMonth(),
    endDate: getToday(),
  });
  const [statusFilter, setStatusFilter] = useState('all'); // all | present | absent | late
  const [error, setError] = useState(null);
  const [smsBusy, setSmsBusy] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const [teacherRecords, setTeacherRecords] = useState([]);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  useEffect(() => {
    try {
      fetchSections();
      // initial load handled by Apply button; keep list lightweight on mount
    } catch (err) {
      console.error('Error initializing AttendanceHistory:', err);
      setError('Failed to initialize page');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      if (response && response.sections) {
        setSections(Array.isArray(response.sections) ? response.sections : []);
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
      setSections([]);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.sectionId) params.sectionId = filters.sectionId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await getSessionHistory(params);
      if (response && response.sessions) {
        setSessions(Array.isArray(response.sessions) ? response.sessions : []);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Sessions fetch error:', err);
      setToast({ message: err?.error || err?.response?.data?.error || 'Failed to load attendance history', type: 'error' });
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacher = async () => {
    setLoadingTeacher(true);
    try {
      const params = {};
      if (filters.sectionId) params.sectionId = filters.sectionId;
      if (filters.startDate) params.dateFrom = filters.startDate;
      if (filters.endDate) params.dateTo = filters.endDate;
      const res = await getCheckInHistory(params);
      setTeacherRecords(Array.isArray(res?.records) ? res.records : []);
    } catch (err) {
      setToast({ message: err?.error || 'Failed to load teacher attendance', type: 'error' });
      setTeacherRecords([]);
    } finally {
      setLoadingTeacher(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    if (!filters.sectionId) {
      setToast({ message: 'Please select a section', type: 'error' });
      return;
    }
    if (activeTab === 'teacher') fetchTeacher();
    else fetchSessions();
  };

  const handleSmsAbsentToday = async () => {
    const scope = filters.sectionId
      ? 'the selected section'
      : 'all sections';
    if (
      !window.confirm(
        `Send SMS to guardians of students marked absent today for ${scope}? (Uses server date/timezone and Twilio.)`
      )
    ) {
      return;
    }
    setSmsBusy(true);
    try {
      const params = {};
      if (filters.sectionId) params.sectionId = filters.sectionId;
      const res = await notifyAbsentTodaySMS(params);
      setToast({
        message: `SMS: ${res.sent} sent, ${res.failed} failed, ${res.skipped} skipped (${res.uniqueAbsentStudents} absent students).`,
        type: res.sent > 0 ? 'success' : 'error',
      });
    } catch (err) {
      setToast({ message: err?.error || 'SMS request failed', type: 'error' });
    } finally {
      setSmsBusy(false);
    }
  };

  const handleViewDetails = async (sessionId) => {
    if (!sessionId) {
      setToast({ message: 'Invalid session ID', type: 'error' });
      return;
    }
    setLoadingDetails(true);
    setShowModal(true);
    try {
      const response = await getSessionDetails(sessionId);
      if (response) {
        setSessionDetails(response);
        setSelectedSession(sessionId);
      } else {
        setToast({ message: 'No session details found', type: 'error' });
      }
    } catch (err) {
      console.error('Session details error:', err);
      setToast({ message: err?.error || 'Failed to load session details', type: 'error' });
      setSessionDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSessionDetails(null);
    setSelectedSession(null);
  };

  if (loading) {
    // keep skeleton inside the dashboard shell
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Attendance History">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="text-lg font-semibold text-rose-600 dark:text-rose-300">Error</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">{error}</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              fetchSections();
            }}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const selectedSection = useMemo(
    () => sections.find((s) => String(s._id || s.id) === String(filters.sectionId)),
    [sections, filters.sectionId]
  );

  const filteredSessions = useMemo(() => {
    const list = Array.isArray(sessions) ? sessions : [];
    if (statusFilter === 'all') return list;
    if (statusFilter === 'present') return list.filter((s) => (s.presentCount ?? 0) > 0);
    if (statusFilter === 'absent') return list.filter((s) => (s.absentCount ?? 0) > 0);
    if (statusFilter === 'late') return list.filter((s) => (s.lateCount ?? 0) > 0);
    return list;
  }, [sessions, statusFilter]);

  const grouped = useMemo(() => {
    const bySection = new Map();
    const add = (secId, secName, dateKey, payload) => {
      const sKey = String(secId || 'unknown');
      const sectionEntry = bySection.get(sKey) || { sectionId: sKey, sectionName: secName || 'Section', dates: new Map() };
      const dKey = String(dateKey || 'unknown-date');
      const day = sectionEntry.dates.get(dKey) || { date: dKey, items: [] };
      day.items.push(payload);
      sectionEntry.dates.set(dKey, day);
      bySection.set(sKey, sectionEntry);
    };

    if (activeTab === 'teacher') {
      (teacherRecords || []).forEach((r) => {
        const sec = r.sectionId;
        const secId = sec?._id || r.sectionId;
        const secName = sec?.sectionName || 'Department';
        add(secId, secName, r.date, { kind: 'checkin', record: r });
      });
    } else {
      (filteredSessions || []).forEach((s) => {
        add(s.sectionId || s.section?._id || s.section, s.sectionName, s.date, { kind: 'session', session: s });
      });
    }

    return Array.from(bySection.values()).map((sec) => ({
      ...sec,
      dates: Array.from(sec.dates.values())
        .map((d) => ({ ...d }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    }));
  }, [activeTab, teacherRecords, filteredSessions]);

  const sectionCards = useMemo(() => {
    if (!filters.sectionId) return [];
    const secGroup = grouped.find((g) => String(g.sectionId) === String(filters.sectionId));
    if (!secGroup) return [];

    const timelineItems = secGroup.dates.map((d) => {
      const sessionsInDay = d.items.filter((x) => x.kind === 'session').map((x) => x.session);
      const checkinsInDay = d.items.filter((x) => x.kind === 'checkin').map((x) => x.record);

      if (activeTab === 'teacher') {
        const present = checkinsInDay.filter((r) => r.checkInTime).length;
        const absent = 0;
        return {
          key: `${secGroup.sectionId}:${d.date}`,
          title: formatDate(d.date),
          present,
          absent,
          late: undefined,
          raw: { date: d.date, items: d.items },
        };
      }

      const present = sessionsInDay.reduce((sum, s) => sum + Number(s.presentCount || 0), 0);
      const absent = sessionsInDay.reduce((sum, s) => sum + Number(s.absentCount || 0), 0);
      const late = sessionsInDay.reduce((sum, s) => sum + Number(s.lateCount || 0), 0);
      return {
        key: `${secGroup.sectionId}:${d.date}`,
        title: formatDate(d.date),
        present,
        absent,
        late,
        raw: { date: d.date, items: d.items },
      };
    });

    const totalStudents =
      activeTab === 'teacher'
        ? undefined
        : Math.max(
            ...secGroup.dates.flatMap((d) =>
              d.items.filter((x) => x.kind === 'session').map((x) => Number(x.session.totalStudents || 0))
            ),
            0
          );

    const totals = timelineItems.reduce(
      (acc, it) => ({ present: acc.present + (it.present || 0), absent: acc.absent + (it.absent || 0) }),
      { present: 0, absent: 0 }
    );
    const attendanceRate = totals.present + totals.absent > 0 ? (totals.present / (totals.present + totals.absent)) * 100 : 0;

    return [
      {
        sectionId: secGroup.sectionId,
        sectionName: secGroup.sectionName,
        totalStudents,
        attendanceRate,
        timelineItems,
      },
    ];
  }, [filters.sectionId, grouped, activeTab]);

  return (
    <DashboardLayout pageTitle="Attendance History">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-6">
        <PageHeader
          title="Attendance History"
          subtitle="View attendance by section and date"
          actions={
            canViewTeacherAttendance ? (
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setActiveTab('student')}
                  className={[
                    'px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
                    activeTab === 'student'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Student Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('teacher')}
                  className={[
                    'px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
                    activeTab === 'teacher'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Teacher Attendance
                </button>
              </div>
            ) : null
          }
        />

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Filters</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300/70">
            Select a section and date range. History is grouped as Section → Date → Records.
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">Section</label>
              <select
                value={filters.sectionId}
                onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              >
                <option value="">Select Section…</option>
                {sections.map((sec) => (
                  <option key={sec._id || sec.id} value={sec._id || sec.id}>
                    {sec.sectionName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300/70">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={activeTab === 'teacher'}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/60 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-300/70">
              {selectedSection ? (
                <span>
                  Selected: <span className="font-semibold text-slate-900 dark:text-white">{selectedSection.sectionName}</span>
                </span>
              ) : (
                <span>Please select a section to view history.</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
            >
              Apply
            </button>
          </div>
        </div>

        {canViewTeacherAttendance && activeTab === 'student' && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Notify guardians by SMS that the student <strong>did not attend today</strong> (server date /
                timezone). Sends one message per student (deduplicated). Respect Twilio limits — configure{' '}
                <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">SMS_MAX_PER_RUN</code> if
                needed.
              </p>
              <button
                type="button"
                disabled={smsBusy}
                onClick={handleSmsAbsentToday}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
              >
                {smsBusy ? 'Sending…' : 'Send absent SMS (today)'}
              </button>
            </div>
          )}

        {/* Section-based cards */}
        {!filters.sectionId ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-slate-900/40">
            <div className="mx-auto max-w-md">
              <div className="text-lg font-semibold text-slate-900 dark:text-white">Select a section to view history</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                Attendance history is grouped by section and date for easier analysis.
              </div>
            </div>
          </div>
        ) : (activeTab === 'teacher' ? loadingTeacher : loading) ? (
          <HistorySkeleton cards={1} />
        ) : sectionCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-slate-900/40">
            <div className="mx-auto max-w-md">
              <div className="text-lg font-semibold text-slate-900 dark:text-white">No attendance data for this section</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                Try expanding the date range or clearing the status filter.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sectionCards.map((c) => (
              <AttendanceSectionCard
                key={c.sectionId}
                sectionName={c.sectionName}
                totalStudents={c.totalStudents}
                attendanceRate={c.attendanceRate}
                expanded={expandedSections[c.sectionId] ?? true}
                onToggleExpanded={() =>
                  setExpandedSections((prev) => ({ ...prev, [c.sectionId]: !(prev[c.sectionId] ?? true) }))
                }
                timelineItems={c.timelineItems}
                onViewDetails={(it) => {
                  // pick first session for the date for details (student mode)
                  if (activeTab === 'teacher') {
                    setToast({ message: 'Teacher details view coming next (needs grouped check-in details UI).', type: 'info' });
                    return;
                  }
                  const session = it?.raw?.items?.find((x) => x.kind === 'session')?.session;
                  if (session) handleViewDetails(session.sessionId || session._id);
                }}
              />
            ))}
          </div>
        )}

          {/* Session Details Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/70 dark:border-white/10">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Details</h2>
                    {sessionDetails?.session && (
                      <p className="text-sm text-slate-600 dark:text-slate-300/70 mt-1">
                        {sessionDetails.session.sectionName} - {formatDate(sessionDetails.session.date)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
                    </div>
                  ) : sessionDetails ? (
                    <>
                      {/* Session Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">Total Students</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                            {sessionDetails.session.totalStudents}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">Present</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                            {sessionDetails.session.presentCount}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">Absent</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                            {sessionDetails.session.absentCount}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300/70">Late</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                            {sessionDetails.session.lateCount}
                          </p>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Member:</span>{' '}
                            <span className="text-gray-900">
                              {sessionDetails.session.memberName ?? sessionDetails.session.lecturerName}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Duration:</span>{' '}
                            <span className="text-gray-900">{sessionDetails.session.duration}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Start Time:</span>{' '}
                            <span className="text-gray-900">
                              {new Date(sessionDetails.session.startTime).toLocaleString()}
                            </span>
                          </div>
                          {sessionDetails.session.endTime && (
                            <div>
                              <span className="font-medium text-gray-700">End Time:</span>{' '}
                              <span className="text-gray-900">
                                {new Date(sessionDetails.session.endTime).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student Attendance Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-white/10">
                          <thead className="bg-slate-100 dark:bg-white/5">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Roll No
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Guardian
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                DOB
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gender
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time Marked
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Scan Time
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Late Count
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-white/10">
                            {sessionDetails.studentAttendance?.map((student, index) => (
                              <tr key={student.studentId || index} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.rollNo}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {student.studentName}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {student.guardianName || student.guardianPhone ? (
                                    <span>
                                      {student.guardianName || '—'}
                                      {student.guardianPhone && (
                                        <span className="block text-xs text-gray-500">{student.guardianPhone}</span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '—'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <StatusPill status={student.status} />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {student.timestamp ? (
                                    formatDateTime(
                                      student.timestamp.split(' ')[0],
                                      student.timestamp.split(' ')[1]
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {student.lastScanTime ? (
                                    formatDateTime(
                                      new Date(student.lastScanTime).toISOString().split('T')[0],
                                      new Date(student.lastScanTime).toTimeString().split(' ')[0]
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {student.consecutiveLateCount > 0 ? (
                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                      {student.consecutiveLateCount} consecutive
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No session details available
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-200/70 dark:border-white/10 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
};

export default AttendanceHistory;
