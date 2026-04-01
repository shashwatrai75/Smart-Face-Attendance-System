import PropTypes from 'prop-types';

const HistorySkeleton = ({ cards = 1 }) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
};

HistorySkeleton.propTypes = {
  cards: PropTypes.number,
};

export default HistorySkeleton;

