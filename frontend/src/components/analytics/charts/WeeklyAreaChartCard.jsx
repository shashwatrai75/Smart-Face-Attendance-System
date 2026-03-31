import PropTypes from 'prop-types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../ChartCard';
import ChartEmpty from '../ChartEmpty';

const WeeklyAreaChartCard = ({ data = [], formatX }) => {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard
      title="Weekly Trends"
      description="Smoothed weekly view of attendance percentage."
      rightSlot={<span className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">Area</span>}
    >
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'rgba(100,116,139,0.95)' }} tickFormatter={formatX} />
              <YAxis tick={{ fontSize: 12, fill: 'rgba(100,116,139,0.95)' }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="attendancePercentage"
                name="Attendance %"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#attFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty title="No weekly trend data" />
      )}
    </ChartCard>
  );
};

WeeklyAreaChartCard.propTypes = {
  data: PropTypes.array,
  formatX: PropTypes.func,
};

export default WeeklyAreaChartCard;

