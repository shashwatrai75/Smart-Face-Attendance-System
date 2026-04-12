import PropTypes from 'prop-types';

function formatLastSession(value) {
  if (value == null) return null;
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
}

const SectionCard = ({ section, meta, statsLoading, onStartSession, onViewAttendance }) => {
  const m = meta || {};
  const students = m.studentCount;
  const present = m.presentToday;
  const lastSession = formatLastSession(m.lastSessionAt);

  const isActive = !!m.isActive;
  const badge = isActive ? (
    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-400/20 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
      Inactive
    </span>
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{section.sectionName}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total students</p>
              <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{statsLoading ? '—' : students ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Present today</p>
              <p className="mt-0.5 font-semibold text-emerald-700 dark:text-emerald-300">{statsLoading ? '—' : present ?? 0}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Last session</p>
              <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{lastSession || '—'}</p>
            </div>
          </div>
        </div>
        {badge}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
        <button
          type="button"
          onClick={() => onStartSession(section)}
          disabled={isActive}
          className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
        >
          {isActive ? 'Session active' : 'Start session'}
        </button>
        <button
          type="button"
          onClick={() => onViewAttendance(section, m)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:hover:bg-white/10"
        >
          View attendance
        </button>
      </div>
    </div>
  );
};

SectionCard.propTypes = {
  section: PropTypes.object.isRequired,
  meta: PropTypes.object,
  statsLoading: PropTypes.bool,
  onStartSession: PropTypes.func.isRequired,
  onViewAttendance: PropTypes.func.isRequired,
};

export default SectionCard;
