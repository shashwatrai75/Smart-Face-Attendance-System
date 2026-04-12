import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const StatCard = ({ label, value, tone = 'primary', trend, icon, to }) => {
  const toneStyles = {
    primary:
      'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/20',
    success:
      'bg-green-500/10 text-green-700 ring-green-500/20 dark:bg-green-400/10 dark:text-green-200 dark:ring-green-400/20',
    warning:
      'bg-orange-500/10 text-orange-800 ring-orange-500/20 dark:bg-orange-400/10 dark:text-orange-200 dark:ring-orange-400/20',
    danger: 'bg-rose-500/10 text-rose-700 ring-rose-500/15 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/15',
  };

  const trendTone =
    typeof trend?.value === 'number'
      ? trend.value > 0
        ? 'text-green-600 dark:text-green-300'
        : trend.value < 0
          ? 'text-rose-600 dark:text-rose-300'
          : 'text-slate-500 dark:text-slate-300/70'
      : 'text-slate-500 dark:text-slate-300/70';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
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

      {trend != null && (
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
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 opacity-60 transition-all duration-300 group-hover:opacity-90" />
          </div>
        </div>
      )}
    </>
  );

  const shellClass =
    'group block rounded-xl border border-slate-200/70 bg-white p-6 text-inherit no-underline shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40';

  if (to) {
    return (
      <Link to={to} className={shellClass}>
        {inner}
      </Link>
    );
  }

  return <div className={shellClass}>{inner}</div>;
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['primary', 'success', 'warning', 'danger']),
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  to: PropTypes.string,
  trend: PropTypes.shape({
    value: PropTypes.number,
    label: PropTypes.string,
  }),
};

export default StatCard;

