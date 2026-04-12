import PropTypes from 'prop-types';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-white/10 dark:bg-slate-900">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{v} present</p>
    </div>
  );
}

ChartTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

const TeacherCharts = ({ data, loading }) => {
  const hasData = Array.isArray(data) && data.length > 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100 dark:bg-white/5" />
        <div className="mt-4 h-[260px] animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Attendance Overview</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Weekly trend of total present marks across your class sessions.
      </p>
      <div className="mt-4 h-[min(280px,50vw)] min-h-[220px] w-full min-w-0">
        {hasData && data.some((d) => Number(d.present) > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#c4b5fd' }} />
              <Line
                type="monotone"
                dataKey="present"
                name="Present"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#7c3aed' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No attendance trend yet</p>
            <p className="mt-1 max-w-sm px-4 text-xs text-slate-500 dark:text-slate-400">
              Start sessions and mark attendance this week to see your overview here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

TeacherCharts.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      present: PropTypes.number,
    })
  ),
  loading: PropTypes.bool,
};

export default TeacherCharts;
