import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSections, getSessionDetails, getSessionHistory, getStudents, startSession } from '../api/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import PageHeader from '../components/userManagement/PageHeader';
import Toast from '../components/Toast';
import TeacherStatsCards from '../components/dashboard/teacher/TeacherStatsCards';
import TeacherCharts from '../components/dashboard/teacher/TeacherCharts';
import SectionCard from '../components/dashboard/teacher/SectionCard';
import ActivityPanel from '../components/dashboard/teacher/ActivityPanel';
import SessionStatusCard from '../components/dashboard/teacher/SessionStatusCard';
import TeacherQuickActions from '../components/dashboard/teacher/TeacherQuickActions';
import { getFirstOfMonth, getToday } from '../utils/date';

function addDaysFromToday(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatActivityTime(session) {
  const st = session?.startTime;
  if (st) {
    try {
      return new Date(st).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      // fall through
    }
  }
  if (session?.date) {
    return session.date;
  }
  return 'Recently';
}

const MemberDashboard = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [metaBySectionId, setMetaBySectionId] = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentSessions, setRecentSessions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [sessionsFetchLoading, setSessionsFetchLoading] = useState(true);
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
      navigate(`/member/attendance?sessionId=${response.sessionId}&sectionId=${section._id}&sectionType=class`);
    } catch (err) {
      setToast({ message: err.error || 'Failed to start session', type: 'error' });
    }
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const today = getToday();
      const startRange = addDaysFromToday(-13);
      try {
        const res = await getSessionHistory({ startDate: startRange, endDate: today });
        if (!alive) return;
        const sessions = Array.isArray(res?.sessions) ? res.sessions : [];
        setRecentSessions(sessions);

        const byDate = {};
        sessions.forEach((s) => {
          if (!s.date) return;
          byDate[s.date] = (byDate[s.date] || 0) + Number(s.presentCount || 0);
        });
        const points = [];
        for (let i = 6; i >= 0; i -= 1) {
          const key = addDaysFromToday(-i);
          const dt = new Date(`${key}T12:00:00`);
          points.push({
            name: dt.toLocaleDateString('en-US', { weekday: 'short' }),
            present: byDate[key] || 0,
          });
        }
        setChartData(points);
      } catch {
        if (alive) {
          setRecentSessions([]);
          setChartData([]);
        }
      } finally {
        if (alive) setSessionsFetchLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

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
      const monthStart = `${getToday().slice(0, 8)}01`;

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
          let sessionStartTime = null;
          let presentLive = 0;

          try {
            const st = await getStudents(sectionId);
            const list = Array.isArray(st?.students) ? st.students : Array.isArray(st) ? st : [];
            studentCount = list.length;
          } catch {
            studentCount = null;
          }

          try {
            const [todayRes, monthRes] = await Promise.all([
              getSessionHistory({ sectionId, startDate: today, endDate: today }),
              getSessionHistory({ sectionId, startDate: monthStart, endDate: today }),
            ]);
            const todaySessions = Array.isArray(todayRes?.sessions) ? todayRes.sessions : [];
            if (todaySessions.length > 0) {
              const sorted = [...todaySessions].sort(
                (a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0)
              );
              const s0 = sorted[0];
              presentToday = Number(s0.presentCount || 0);
              absentToday = Number(s0.absentCount || 0);
            }

            const monthSessions = Array.isArray(monthRes?.sessions) ? monthRes.sessions : [];
            if (monthSessions.length > 0) {
              const sorted = [...monthSessions].sort(
                (a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0)
              );
              lastSessionAt = sorted[0]?.startTime || sorted[0]?.date || null;
            }
          } catch {
            // ignore
          }

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
              const ended = details?.session?.endTime;
              isActive = !ended;
              if (!isActive) {
                try {
                  window.localStorage.removeItem(`sf:activeClassSession:${sectionId}`);
                } catch {
                  // ignore
                }
                activeSessionId = null;
              } else {
                const st = details?.session?.startTime;
                sessionStartTime = st ? new Date(st).getTime() : null;
                presentLive = Number(details?.session?.presentCount ?? presentToday);
              }
            } catch {
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
              sessionStartTime,
              presentLive: isActive ? presentLive : presentToday,
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

  const activeSessionPayload = useMemo(() => {
    const hit = classSections
      .map((s) => ({ s, m: metaBySectionId[String(s._id || s.id)] }))
      .find((x) => x?.m?.isActive);
    if (!hit) return null;
    const { s, m } = hit;
    return {
      sectionName: s.sectionName,
      sessionStartTime: m.sessionStartTime,
      presentCount: m.presentLive ?? m.presentToday,
      totalStudents: m.studentCount,
      sessionId: m.activeSessionId,
      sectionId: s._id,
    };
  }, [classSections, metaBySectionId]);

  const activityItems = useMemo(() => {
    const items = [];
    if (activeSessionPayload) {
      items.push({
        id: 'live-session',
        type: 'session',
        title: 'Session started',
        detail: activeSessionPayload.sectionName,
        time: 'In progress',
      });
    }

    const sorted = [...recentSessions].sort((a, b) => {
      const ta = new Date(a.startTime || 0).getTime();
      const tb = new Date(b.startTime || 0).getTime();
      return tb - ta;
    });

    const activeSid = activeSessionPayload?.sessionId;
    const filtered = sorted.filter((s) => !activeSid || s.sessionId !== activeSid);

    filtered.slice(0, 6).forEach((sess, i) => {
      const present = Number(sess.presentCount || 0);
      items.push({
        id: `sess-${sess.sessionId || i}`,
        type: present > 0 ? 'attendance' : 'session',
        title: present > 0 ? 'Attendance marked' : 'Session started',
        detail: `${sess.sectionName || 'Class'} · ${present} present`,
        time: formatActivityTime(sess),
      });
    });

    return items.slice(0, 8);
  }, [recentSessions, activeSessionPayload]);

  const handleViewAttendance = (section, m) => {
    navigate(
      m?.activeSessionId
        ? `/member/attendance?sessionId=${m.activeSessionId}&sectionId=${section._id}&sectionType=class`
        : `/member/attendance?sectionId=${section._id}&sectionType=class`
    );
  };

  const handleQuickStart = () => {
    const first = classSections[0];
    if (first) handleStartClassSession(first);
    else navigate('/member/attendance');
  };

  const statsReady = !statsLoading && !loading;
  const rightColLoading = statsLoading || sessionsFetchLoading;

  return (
    <DashboardLayout pageTitle="Teacher Dashboard">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6">
        <PageHeader title="Teacher Dashboard" subtitle="Daily attendance, sessions, and your classes in one place." />

        <TeacherStatsCards
          totalStudents={totals.totalStudents}
          presentToday={totals.presentToday}
          absentToday={totals.absentToday}
          loading={!statsReady}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <TeacherCharts data={chartData} loading={sessionsFetchLoading} />

            <TeacherQuickActions
              disableStart={classSections.length === 0}
              onStartClick={handleQuickStart}
            />

            {classSections.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your sections</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Start a session or open attendance for each class.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {classSections.map((section) => {
                    const sid = String(section._id || section.id);
                    return (
                      <SectionCard
                        key={sid}
                        section={section}
                        meta={metaBySectionId[sid]}
                        statsLoading={statsLoading}
                        onStartSession={handleStartClassSession}
                        onViewAttendance={handleViewAttendance}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/40">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No sections assigned</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                    No sessions yet. Start a session to begin attendance tracking. Ask your administrator to assign
                    class sections to your account if this stays empty.
                  </p>
                </div>
              )
            )}
          </div>

          <div className="space-y-6 lg:col-span-1">
            <SessionStatusCard
              active={activeSessionPayload}
              loading={rightColLoading}
              onContinue={
                activeSessionPayload
                  ? () =>
                      navigate(
                        `/member/attendance?sessionId=${activeSessionPayload.sessionId}&sectionId=${activeSessionPayload.sectionId}&sectionType=class`
                      )
                  : undefined
              }
            />
            <ActivityPanel items={activityItems} loading={sessionsFetchLoading} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MemberDashboard;
