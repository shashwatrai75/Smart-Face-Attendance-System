import PropTypes from 'prop-types';

const ChartSkeleton = ({ height = 280 }) => {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
      <div className="animate-pulse">
        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-2 h-3 w-56 rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-6 rounded-xl bg-slate-100 dark:bg-white/5" style={{ height }} />
      </div>
    </div>
  );
};

ChartSkeleton.propTypes = {
  height: PropTypes.number,
};

export default ChartSkeleton;

