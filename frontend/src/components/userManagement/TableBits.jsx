import PropTypes from 'prop-types';

export const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M16.6 16.6 21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const EyeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const EditIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13.5 6.5 17.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M6 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 7l1 14h6l1-14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M10.5 11v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M13.5 11v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ActionIconButton = ({ title, tone = 'neutral', onClick, children }) => {
  const toneCls =
    tone === 'danger'
      ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10'
      : tone === 'primary'
        ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10'
        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5';

  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={['inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors', toneCls].join(' ')}
    >
      {children}
    </button>
  );
};

ActionIconButton.propTypes = {
  title: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['neutral', 'primary', 'danger']),
  onClick: PropTypes.func,
  children: PropTypes.node,
};

export const TableSkeleton = ({ rows = 8, cols = 7 }) => {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr
          key={idx}
          className={[
            'border-t border-slate-200/70 dark:border-white/10',
            idx % 2 ? 'bg-slate-50/40 dark:bg-white/[0.03]' : '',
          ].join(' ')}
        >
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-4">
              <div className="h-3 w-full max-w-[180px] animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  cols: PropTypes.number,
};

