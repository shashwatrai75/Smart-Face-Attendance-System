import PropTypes from 'prop-types';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const Pagination = ({ page, pageSize, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const safePage = clamp(page, 1, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  const go = (p) => onChange(clamp(p, 1, totalPages));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-slate-500 dark:text-slate-300/70">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span>–<span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => go(safePage - 1)}
          disabled={safePage <= 1}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-white/5"
        >
          Prev
        </button>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200">
          Page {safePage} / {totalPages}
        </div>
        <button
          type="button"
          onClick={() => go(safePage + 1)}
          disabled={safePage >= totalPages}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-white/5"
        >
          Next
        </button>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Pagination;

