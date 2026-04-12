import PropTypes from 'prop-types';

const icons = {
  session: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  attendance: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  enroll: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  default: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

const wrapClass = {
  session: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  attendance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  enroll: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  default: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
};

const ActivityPanel = ({ items, loading }) => (
  <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent activity</h3>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest actions across your classes.</p>

    <ul className="mt-4 space-y-3">
      {loading ? (
        [1, 2, 3].map((k) => (
          <li key={k} className="animate-pulse rounded-xl border border-slate-100 p-3 dark:border-white/5">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-white/10" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/4 max-w-[200px] rounded bg-slate-100 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/10" />
              </div>
            </div>
          </li>
        ))
      ) : items.length === 0 ? (
        <li className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          No recent activity yet.
        </li>
      ) : (
        items.map((item) => {
          const type = item.type || 'default';
          return (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-violet-200/80 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/30"
            >
              <span
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  wrapClass[type] || wrapClass.default,
                ].join(' ')}
              >
                {icons[type] || icons.default}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{item.detail}</p>
                ) : null}
                <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500">{item.time}</p>
              </div>
            </li>
          );
        })
      )}
    </ul>
  </div>
);

ActivityPanel.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['session', 'attendance', 'enroll', 'default']),
      title: PropTypes.string.isRequired,
      detail: PropTypes.string,
      time: PropTypes.string.isRequired,
    })
  ),
  loading: PropTypes.bool,
};

export default ActivityPanel;
