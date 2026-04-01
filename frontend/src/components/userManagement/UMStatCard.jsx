import PropTypes from 'prop-types';

const toneMap = {
  indigo: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/15 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/15',
  green: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/15',
  red: 'bg-rose-500/10 text-rose-700 ring-rose-500/15 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/15',
  purple: 'bg-purple-500/10 text-purple-700 ring-purple-500/15 dark:bg-purple-400/10 dark:text-purple-200 dark:ring-purple-300/15',
};

const UMStatCard = ({ label, value, tone = 'indigo', icon }) => {
  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
        </div>
        <div className={['shrink-0 rounded-2xl p-3 ring-1', toneMap[tone] || toneMap.indigo].join(' ')}>
          {icon}
        </div>
      </div>
    </div>
  );
};

UMStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['indigo', 'green', 'red', 'purple']),
  icon: PropTypes.node,
};

export default UMStatCard;

