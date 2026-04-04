import PropTypes from 'prop-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartSkeleton from '../../analytics/ChartSkeleton';
import { buildAttendanceTrend, buildPresentAbsentPie, buildSectionBarData } from './chartData';

/** Design tokens: primary purple, success green, warning orange */
const COLOR_LINE = '#7c3aed';
const COLOR_PRESENT = '#7c3aed';
const COLOR_ABSENT = '#ea580c';
const COLOR_BAR = '#16a34a';

const tooltipBoxClass =
  'rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm shadow-lg dark:border-white/10 dark:bg-slate-900';

function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className={tooltipBoxClass}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {row.value}{' '}
        <span className="text-sm font-normal text-gray-500 dark:text-slate-400">check-ins (est.)</span>
      </p>
    </div>
  );
}

LineTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className={tooltipBoxClass}>
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">{name}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">Students</p>
    </div>
  );
}

PieTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className={tooltipBoxClass}>
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {v} <span className="text-sm font-normal text-gray-500 dark:text-slate-400">today (allocated)</span>
      </p>
    </div>
  );
}

BarTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

const ChartShell = ({ title, description, children, className = '' }) => (
  <div
    className={`flex h-full flex-col rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40 ${className}`}
  >
    <div className="shrink-0">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
    <div className="mt-5 min-h-0 flex-1">{children}</div>
  </div>
);

ChartShell.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
};

function AttendanceSummaryCard({ stats }) {
  const present = Math.max(0, Number(stats?.todayAttendance) || 0);
  const enrolled = Math.max(0, Number(stats?.totalStudents) || 0);
  const absent = Math.max(0, enrolled - present);

  const rows = [
    { label: 'Present today', value: present, dot: 'bg-violet-500' },
    { label: 'Absent today', value: absent, dot: 'bg-orange-500' },
    { label: 'Enrolled students', value: enrolled, dot: 'bg-green-500' },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-violet-50/40 p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:from-slate-900/40 dark:to-violet-950/20">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Attendance summary</h3>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
        Quick read on today&apos;s marks versus enrollment.
      </p>
      <ul className="mt-6 flex flex-1 flex-col justify-center gap-4">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/50"
          >
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.dot}`} aria-hidden />
              <span className="text-sm font-medium text-gray-600 dark:text-slate-300">{r.label}</span>
            </div>
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

AttendanceSummaryCard.propTypes = {
  stats: PropTypes.object,
};

const legendFormatter = (value) => (
  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{value}</span>
);

const ChartsSection = ({ loading, stats, sections }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartSkeleton height={288} />
          </div>
          <ChartSkeleton height={288} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartSkeleton height={300} />
          </div>
          <div className="min-h-[300px] animate-pulse rounded-xl border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  const lineData = buildAttendanceTrend(stats);
  const pieData = buildPresentAbsentPie(stats);
  const barData = buildSectionBarData(sections, stats?.todayAttendance);
  const pieTotal = pieData.reduce((s, d) => s + (Number(d.value) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Row 1: line (2) + donut (1) */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <ChartShell
          title="Attendance Trend"
          description="Estimated seven-day movement from your aggregate totals."
          className="lg:col-span-2"
        >
          <div className="h-[min(320px,42vw)] min-h-[260px] w-full min-w-0 lg:h-[288px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<LineTooltip />} cursor={{ stroke: '#c4b5fd', strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  name="Check-ins"
                  stroke={COLOR_LINE}
                  strokeWidth={3}
                  dot={{ r: 4, fill: COLOR_LINE, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>

        <ChartShell
          title="Present vs Absent"
          description="Today: marked present compared to enrolled students not yet present."
          className="lg:col-span-1"
        >
          <div className="h-[min(320px,55vw)] min-h-[260px] w-full min-w-0 lg:h-[288px]">
            {pieTotal === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No snapshot yet</p>
                <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-gray-500 dark:text-slate-400">
                  When enrollment and today&apos;s attendance exist, you will see Present vs Absent here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={entry.key === 'present' ? COLOR_PRESENT : COLOR_ABSENT}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    formatter={legendFormatter}
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartShell>
      </div>

      {/* Row 2: bar (2) + summary (1) — fills space, balances width */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <ChartShell
          title="Section-wise Attendance"
          description="Today&apos;s total split across sections for a quick comparison."
          className="lg:col-span-2"
        >
          <div className="h-[min(340px,50vw)] min-h-[260px] w-full min-w-0 lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 12, right: 12, left: -8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={64}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={28}
                  formatter={() => legendFormatter('Allocated today')}
                  wrapperStyle={{ paddingBottom: 4 }}
                  iconType="square"
                />
                <Bar dataKey="attendance" name="Allocated today" radius={[8, 8, 0, 0]} fill={COLOR_BAR} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartShell>

        <div className="lg:col-span-1">
          <AttendanceSummaryCard stats={stats} />
        </div>
      </div>
    </div>
  );
};

ChartsSection.propTypes = {
  loading: PropTypes.bool,
  stats: PropTypes.object,
  sections: PropTypes.array,
};

export default ChartsSection;
