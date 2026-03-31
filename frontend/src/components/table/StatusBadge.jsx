import PropTypes from 'prop-types';

const tones = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20',
  absent: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20',
  late: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20',
  neutral: 'bg-slate-50 text-slate-700 ring-slate-600/15 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
};

const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

const StatusBadge = ({ status }) => {
  const key = normalize(status);
  const tone =
    key === 'present'
      ? 'present'
      : key === 'absent'
        ? 'absent'
        : key === 'late'
          ? 'late'
          : 'neutral';

  const label =
    tone === 'present' ? 'Present' : tone === 'absent' ? 'Absent' : tone === 'late' ? 'Late' : status || '—';

  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', tones[tone]].join(' ')}>
      <span
        className={[
          'mr-1.5 h-1.5 w-1.5 rounded-full',
          tone === 'present'
            ? 'bg-emerald-500'
            : tone === 'absent'
              ? 'bg-rose-500'
              : tone === 'late'
                ? 'bg-amber-500'
                : 'bg-slate-400',
        ].join(' ')}
      />
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

export default StatusBadge;

