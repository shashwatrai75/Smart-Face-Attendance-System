import PropTypes from 'prop-types';

const StatCard = ({ label, value, tone = 'primary', trend, icon }) => {
  const toneStyles = {
    primary: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/15 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/15',
    success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/15',
    warning: 'bg-amber-500/10 text-amber-800 ring-amber-500/15 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/15',
    danger: 'bg-rose-500/10 text-rose-700 ring-rose-500/15 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/15',
  };

  const trendTone =
    typeof trend?.value === 'number'
      ? trend.value > 0
        ? 'text-emerald-600 dark:text-emerald-300'
        : trend.value < 0
          ? 'text-rose-600 dark:text-rose-300'
          : 'text-slate-500 dark:text-slate-300/70'
      : 'text-slate-500 dark:text-slate-300/70';

  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-medium text-slate-600 dark:text-slate-300/70">{label}</div>
          <div className="mt-2 text-[32px] font-bold tracking-tight text-slate-900 dark:text-white leading-none">
            {value}
          </div>
        </div>
        <div
          className={[
            'shrink-0 rounded-2xl p-3 ring-1 flex items-center justify-center',
            toneStyles[tone] || toneStyles.primary,
          ].join(' ')}
        >
          {icon ? (
            typeof icon === 'string' ? (
              <span className="text-[22px] leading-none" aria-hidden="true">
                {icon}
              </span>
            ) : (
              icon
            )
          ) : (
            <div className="h-6 w-6 rounded-lg bg-current/10" />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className={['text-sm font-semibold', trendTone].join(' ')}>
          {typeof trend?.value === 'number' ? (
            <span>
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
              <span className="font-medium text-slate-400 dark:text-slate-400"> · </span>
              <span className="font-medium text-slate-500 dark:text-slate-300/70">{trend.label || 'vs last period'}</span>
            </span>
          ) : (
            <span className="font-medium text-slate-400 dark:text-slate-400">No trend data</span>
          )}
        </div>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-60 transition-all duration-300 group-hover:opacity-90" />
        </div>
      </div>
    </div>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['primary', 'success', 'warning', 'danger']),
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  trend: PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  }),
};

export default StatCard;

