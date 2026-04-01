import PropTypes from 'prop-types';

const SectionCardSkeleton = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/40"
        >
          <div className="animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
              <div className="flex gap-2">
                <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
            <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </>
  );
};

SectionCardSkeleton.propTypes = {
  count: PropTypes.number,
};

export default SectionCardSkeleton;

