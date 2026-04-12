import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

function formatElapsed(startMs, _refreshToken) {
  if (!startMs || Number.isNaN(startMs)) return '—';
  void _refreshToken;
  const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const SessionStatusCard = ({ active, onContinue, loading }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active?.sessionStartTime) return undefined;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active?.sessionStartTime]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Session status</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live session and duration.</p>
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Not started</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            No sessions yet. Start a session to begin attendance tracking.
          </p>
        </div>
      </div>
    );
  }

  const duration = formatElapsed(active.sessionStartTime, tick);
  const present = Number(active.presentCount ?? 0);
  const total = Number(active.totalStudents ?? 0);

  return (
    <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-b from-emerald-50/90 to-white p-4 shadow-sm dark:border-emerald-500/25 dark:from-emerald-950/30 dark:to-slate-900/40">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Session active</h3>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-emerald-800 dark:text-emerald-200">{active.sectionName}</p>

      <dl className="mt-4 space-y-3 rounded-xl border border-emerald-200/60 bg-white/80 p-4 dark:border-emerald-500/20 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Duration</dt>
          <dd className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{duration}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Students present</dt>
          <dd className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {present}
            <span className="font-medium text-slate-400 dark:text-slate-500"> / {total || '—'}</span>
          </dd>
        </div>
      </dl>

      {onContinue ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md"
        >
          Continue attendance
        </button>
      ) : null}
    </div>
  );
};

SessionStatusCard.propTypes = {
  active: PropTypes.shape({
    sectionName: PropTypes.string,
    sessionStartTime: PropTypes.number,
    presentCount: PropTypes.number,
    totalStudents: PropTypes.number,
    sessionId: PropTypes.string,
    sectionId: PropTypes.string,
  }),
  onContinue: PropTypes.func,
  loading: PropTypes.bool,
};

export default SessionStatusCard;
