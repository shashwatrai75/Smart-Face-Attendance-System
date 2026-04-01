import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSections, getSessionDetails, getSessionHistory, getStudents, startSession } from '../api/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';
import Toast from '../components/Toast';
import { formatDateTime, getFirstOfMonth, getToday } from '../utils/date';

const MemberDashboard = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [metaBySectionId, setMetaBySectionId] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await getSections();
      const list = (response.sections || []).filter(
        (s) => s.sectionType === 'class' && (s.parentSectionId || !s.hasSubclasses)
      );
      setSections(list);
    } catch (err) {
      setToast({ message: 'Failed to load sections', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const classSections = sections;

  const handleStartClassSession = async (section) => {
    try {
      const response = await startSession({ sectionId: section._id });
      try {
        window.localStorage.setItem(
          `sf:activeClassSession:${section._id}`,
          JSON.stringify({ sessionId: response.sessionId, sectionId: section._id, startedAt: new Date().toISOString() })
        );
      } catch {
        // ignore
      }
      navigate(
        `/member/attendance?sessionId=${response.sessionId}&sectionId=${section._id}&sectionType=class`
      );
    } catch (err) {
      setToast({ message: err.error || 'Failed to start session', type: 'error' });
    }
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!Array.isArray(classSections) || classSections.length === 0) {
        if (!alive) return;
        setMetaBySectionId({});
        setStatsLoading(false);
        return;
      }

      setStatsLoading(true);
      const today = getToday();
      const monthStart = getFirstOfMonth();

      const entries = await Promise.all(
        classSections.map(async (sec) => {
          const sectionId = sec._id || sec.id;
          const key = String(sectionId);

          let studentCount = null;
          let presentToday = 0;
          let absentToday = 0;
          let lastSessionAt = null;
          let activeSessionId = null;
          let isActive = false;

          // Student count
          try {
            const st = await getStudents(sectionId);
            const list = Array.isArray(st?.students) ? st.students : Array.isArray(st) ? st : [];
            studentCount = list.length;
          } catch {
            studentCount = null;
          }

          // Session history (today + last session time)
          try {
            const [todayRes, monthRes] = await Promise.all([
              getSessionHistory({ sectionId, startDate: today, endDate: today }),
              getSessionHistory({ sectionId, startDate: monthStart, endDate: today }),
            ]);
            const todaySessions = Array.isArray(todayRes?.sessions) ? todayRes.sessions : [];
            if (todaySessions.length > 0) {
              // Use most recent session today
              const sorted = [...todaySessions].sort(
                (a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0)
              );
              const s0 = sorted[0];
              presentToday = Number(s0.presentCount || 0);
              absentToday = Number(s0.absentCount || 0);
            }

            const monthSessions = Array.isArray(monthRes?.sessions) ? monthRes.sessions : [];
            if (monthSessions.length > 0) {
              const sorted = [...monthSessions].sort(
                (a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0)
              );
              lastSessionAt = sorted[0]?.startedAt || sorted[0]?.createdAt || null;
            }
          } catch {
            // ignore
          }

          // Active session probe (from localStorage + server)
          try {
            const raw = window.localStorage.getItem(`sf:activeClassSession:${sectionId}`);
            const parsed = raw ? JSON.parse(raw) : null;
            activeSessionId = parsed?.sessionId || null;
          } catch {
            activeSessionId = null;
          }
          if (activeSessionId) {
            try {
              const details = await getSessionDetails(activeSessionId);
              const ended = details?.session?.endedAt || details?.session?.endTime;
              isActive = !ended;
              if (!isActive) {
                try {
                  window.localStorage.removeItem(`sf:activeClassSession:${sectionId}`);
                } catch {
                  // ignore
                }
                activeSessionId = null;
              }
            } catch {
              // If server can't find it, clear local reference
              try {
                window.localStorage.removeItem(`sf:activeClassSession:${sectionId}`);
              } catch {
                // ignore
              }
              activeSessionId = null;
              isActive = false;
            }
          }

          return [
            key,
            {
              studentCount,
              presentToday,
              absentToday,
              lastSessionAt,
              activeSessionId,
              isActive,
            },
          ];
        })
      );

      if (!alive) return;
      setMetaBySectionId(Object.fromEntries(entries));
      setStatsLoading(false);
    };

    run();
    return () => {
      alive = false;
    };
  }, [classSections]);

  const totals = useMemo(() => {
    const items = Object.values(metaBySectionId || {});
    const totalStudents = items.reduce((sum, x) => sum + Number(x.studentCount || 0), 0);
    const presentToday = items.reduce((sum, x) => sum + Number(x.presentToday || 0), 0);
    const absentToday = items.reduce((sum, x) => sum + Number(x.absentToday || 0), 0);
    return { totalStudents, presentToday, absentToday };
  }, [metaBySectionId]);

  const StatMini = ({ label, value, tone, icon }) => {
    const toneCls =
      tone === 'green'
        ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20'
        : tone === 'rose'
          ? 'bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20'
          : 'bg-indigo-500/10 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20';
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className={['flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset', toneCls].join(' ')}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">
              {label}
            </div>
            <div className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {statsLoading ? '—' : value}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout pageTitle="Teacher Dashboard">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6">
        <PageHeader title="Teacher Dashboard" subtitle="Manage class attendance sessions" />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatMini
            label="Total Students"
            value={totals.totalStudents}
            tone="indigo"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            }
          />
          <StatMini
            label="Present Today"
            value={totals.presentToday}
            tone="green"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <StatMini
            label="Absent Today"
            value={totals.absentToday}
            tone="rose"
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        {/* Live Session Panel */}
        {(() => {
          const active = classSections
            .map((s) => ({ s, m: metaBySectionId[String(s._id || s.id)] }))
            .find((x) => x?.m?.isActive);
          if (!active) return null;
          const section = active.s;
          const m = active.m;
          const total = Number(m.studentCount || 0);
          const present = Number(m.presentToday || 0);
          return (
            <div className="rounded-2xl border border-emerald-200/60 bg-white p-6 shadow-sm dark:border-emerald-300/20 dark:bg-slate-900/40">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20">
                      Session Active
                    </span>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {section.sectionName}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300/70">
                    Present: <span className="font-semibold text-slate-900 dark:text-white">{present}</span>
                    <span className="text-slate-300 dark:text-white/10"> / </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{total}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-300/70">
                      (today&apos;s latest session snapshot)
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/member/attendance?sessionId=${m.activeSessionId}&sectionId=${section._id}&sectionType=class`
                      )
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700"
                  >
                    Go to Live Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/member/history')}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              const first = classSections[0];
              if (!first) return;
              handleStartClassSession(first);
            }}
            disabled={classSections.length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Start Session
          </button>
          <button
            type="button"
            onClick={() => navigate('/member/history')}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
          >
            View History
          </button>
          <button
            type="button"
            onClick={() => navigate('/member/attendance')}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
          >
            Go to Live Attendance
          </button>
        </div>

        {/* Class Sections */}
        {classSections.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Class Sections</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Start and manage attendance sessions per section.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classSections.map((section) => {
                const sid = String(section._id || section.id);
                const m = metaBySectionId[sid] || {};
                const badge = m.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20">
                    Session Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                    Not Active
                  </span>
                );
                return (
                  <div
                    key={sid}
                    className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-900 dark:text-white">
                          {section.sectionName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300/70">
                          <span>
                            Students:{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {statsLoading ? '—' : m.studentCount ?? '—'}
                            </span>
                          </span>
                          <span className="text-slate-300 dark:text-white/10">·</span>
                          <span>
                            Last session:{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {m.lastSessionAt ? formatDateTime(m.lastSessionAt) : '—'}
                            </span>
                          </span>
                        </div>
                      </div>
                      {badge}
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => handleStartClassSession(section)}
                        disabled={!!m.isActive}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {m.isActive ? 'Session Active' : 'Start Session'}
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => navigate('/member/history')}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
                        >
                          View History
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              m.activeSessionId
                                ? `/member/attendance?sessionId=${m.activeSessionId}&sectionId=${section._id}&sectionType=class`
                                : `/member/attendance?sectionId=${section._id}&sectionType=class`
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
                        >
                          Live Attendance
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300/70">
            No sections assigned.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MemberDashboard;
