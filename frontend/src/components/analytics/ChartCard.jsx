import PropTypes from 'prop-types';

const ChartCard = ({ title, description, rightSlot, children }) => {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          {description && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300/70">
              {description}
            </div>
          )}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  rightSlot: PropTypes.node,
  children: PropTypes.node,
};

export default ChartCard;

