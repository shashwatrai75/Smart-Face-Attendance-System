import PropTypes from 'prop-types';

const Timeline = ({ items = [], onViewDetails }) => {
  return (
    <div className="relative mt-4">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />
      <div className="space-y-4">
        {items.map((it) => (
          <div key={it.key} className="relative pl-8">
            <div className="absolute left-2 top-1.5 h-4 w-4 rounded-full bg-white ring-2 ring-indigo-500 dark:bg-slate-950 dark:ring-indigo-400" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {it.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20">
                    ✔ Present: {it.present ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">
                    ❌ Absent: {it.absent ?? 0}
                  </span>
                  {typeof it.late === 'number' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20">
                      ⏱ Late: {it.late}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onViewDetails?.(it)}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
              >
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

Timeline.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      present: PropTypes.number,
      absent: PropTypes.number,
      late: PropTypes.number,
    })
  ),
  onViewDetails: PropTypes.func,
};

export default Timeline;

