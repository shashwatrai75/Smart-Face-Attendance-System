import PropTypes from 'prop-types';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import ChartCard from '../ChartCard';
import ChartEmpty from '../ChartEmpty';

const COLORS = {
  Present: '#22c55e',
  Absent: '#ef4444',
  Late: '#f59e0b',
};

const StatusDonutChartCard = ({ data = [] }) => {
  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0);
  const hasData = Array.isArray(data) && data.length > 0 && total > 0;

  return (
    <ChartCard
      title="Present vs Absent"
      description="Status distribution across the selected scope."
      rightSlot={<span className="text-xs font-semibold text-slate-500 dark:text-slate-300/70">Donut</span>}
    >
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={100}
                paddingAngle={2}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {(data || []).map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || entry.color || '#6366f1'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <ChartEmpty title="No status distribution data" />
      )}
    </ChartCard>
  );
};

StatusDonutChartCard.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      color: PropTypes.string,
    })
  ),
};

export default StatusDonutChartCard;

