import PropTypes from 'prop-types';
import Timeline from './Timeline';

const AttendanceSectionCard = ({ sectionName, totalStudents, attendanceRate, expanded, onToggleExpanded, timelineItems, onViewDetails }) => {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900 dark:text-white">
            {sectionName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300/70">
            <span>
              Total students: <span className="font-semibold text-slate-900 dark:text-white">{totalStudents ?? '—'}</span>
            </span>
            <span className="text-slate-300 dark:text-white/10">·</span>
            <span>
              Attendance rate: <span className="font-semibold text-slate-900 dark:text-white">{Number.isFinite(attendanceRate) ? `${attendanceRate.toFixed(1)}%` : '—'}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-white/5"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className={['transition-all duration-300', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'].join(' ')}>
        <Timeline items={timelineItems} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
};

AttendanceSectionCard.propTypes = {
  sectionName: PropTypes.string.isRequired,
  totalStudents: PropTypes.number,
  attendanceRate: PropTypes.number,
  expanded: PropTypes.bool,
  onToggleExpanded: PropTypes.func,
  timelineItems: PropTypes.array,
  onViewDetails: PropTypes.func,
};

export default AttendanceSectionCard;

