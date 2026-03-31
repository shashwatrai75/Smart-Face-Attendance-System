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
import ChartCard from '../ChartCard';
import ChartEmpty from '../ChartEmpty';

const AttendanceLineChartCard = ({ data = [], formatX }) => {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard
      title="Attendance Overview"
      description="Daily trend of attendance rate over your selected range."
      rightSlot={<span className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">Line</span>}
    >
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'rgba(100,116,139,0.95)' }}
                tickFormatter={formatX}
              />
              <YAxis tick={{ fontSize: 12, fill: 'rgba(100,116,139,0.95)' }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attendancePercentage"
                name="Attendance %"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty title="No attendance trend data" />
      )}
    </ChartCard>
  );
};

AttendanceLineChartCard.propTypes = {
  data: PropTypes.array,
  formatX: PropTypes.func,
};

export default AttendanceLineChartCard;

