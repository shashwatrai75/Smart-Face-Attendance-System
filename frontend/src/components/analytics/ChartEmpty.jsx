import PropTypes from 'prop-types';

const ChartEmpty = ({ title = 'No data', description = 'Try changing filters or date range.' }) => {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-white/10 dark:bg-white/5">
      <svg className="h-12 w-12 text-slate-300 dark:text-slate-600" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M10 46V18a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M18 40l10-12 8 8 10-14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300/70">{description}</div>
    </div>
  );
};

ChartEmpty.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
};

export default ChartEmpty;

