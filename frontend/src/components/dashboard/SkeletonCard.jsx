import PropTypes from 'prop-types';

const SkeletonCard = ({ lines = 2 }) => {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
      <div className="animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="w-2/3">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-3 h-8 w-36 rounded bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="mt-5 space-y-2">
          {Array.from({ length: lines }).map((_, idx) => (
            <div key={idx} className="h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
};

SkeletonCard.propTypes = {
  lines: PropTypes.number,
};

export default SkeletonCard;

