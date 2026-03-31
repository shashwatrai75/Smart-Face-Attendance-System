import PropTypes from 'prop-types';

const EmptyState = ({ title = 'No records found', description = 'Try adjusting your search or filters.' }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-slate-900/40">
      <svg className="h-16 w-16 text-slate-300 dark:text-slate-600" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path d="M14 20a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V20Z" stroke="currentColor" strokeWidth="2.2" />
        <path d="M22 26h20M22 32h14M22 38h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M45 45l9 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M50 55a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" stroke="currentColor" strokeWidth="2.2" />
      </svg>
      <div className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-300/70">{description}</div>
    </div>
  );
};

EmptyState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
};

export default EmptyState;

