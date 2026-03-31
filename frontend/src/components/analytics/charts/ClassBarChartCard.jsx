import PropTypes from 'prop-types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../ChartCard';
import ChartEmpty from '../ChartEmpty';

const ClassBarChartCard = ({ data = [] }) => {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <ChartCard
      title="Class-wise Attendance"
      description="Compare present/absent/late across classes or sections."
      rightSlot={<span className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">Bar</span>}
    >
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="sectionName" tick={{ fontSize: 11, fill: 'rgba(100,116,139,0.95)' }} interval={0} height={60} />
              <YAxis tick={{ fontSize: 12, fill: 'rgba(100,116,139,0.95)' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="presentCount" name="Present" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="absentCount" name="Absent" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="lateCount" name="Late" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty title="No class-wise data" />
      )}
    </ChartCard>
  );
};

ClassBarChartCard.propTypes = {
  data: PropTypes.array,
};

export default ClassBarChartCard;

