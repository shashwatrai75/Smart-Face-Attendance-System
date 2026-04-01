import PropTypes from 'prop-types';

const cx = (...v) => v.filter(Boolean).join(' ');

export const StatusBadge = ({ status }) => {
  const key = (status || '').toLowerCase();
  const cls =
    key === 'active'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-300/20'
      : key === 'disabled'
        ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20'
        : 'bg-slate-50 text-slate-700 ring-slate-600/15 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10';

  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : '—';

  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', cls)}>
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

export const RoleBadge = ({ role }) => {
  const key = (role || '').toLowerCase();
  const cls =
    key === 'superadmin'
      ? 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-400/10 dark:text-purple-200 dark:ring-purple-300/20'
      : key === 'admin'
        ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20'
        : key === 'hr'
          ? 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-300/20'
          : 'bg-slate-50 text-slate-700 ring-slate-600/15 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10';

  const label =
    key === 'admin'
      ? 'Office Admin'
      : key === 'hr'
        ? 'Supervisor'
        : key
          ? key.charAt(0).toUpperCase() + key.slice(1)
          : '—';

  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', cls)}>
      {label}
    </span>
  );
};

RoleBadge.propTypes = {
  role: PropTypes.string,
};

