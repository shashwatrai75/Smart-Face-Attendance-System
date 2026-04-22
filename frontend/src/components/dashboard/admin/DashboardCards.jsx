import PropTypes from 'prop-types';
import StatCard from '../StatCard';
import SkeletonCard from '../SkeletonCard';
import { FolderIcon, GraduationIcon, ReportsIcon, UsersIcon } from '../icons';

const iconWrap = (Icon, className) => (
  <Icon className={`h-6 w-6 ${className}`} aria-hidden />
);

const DashboardCards = ({ loading, stats }) => {
  const cards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      tone: 'primary',
      trend: { value: 12, label: 'vs last week' },
      icon: iconWrap(UsersIcon, 'text-violet-600 dark:text-violet-300'),
      to: '/admin/users',
    },
    {
      label: 'Active lecturers',
      value: stats?.activeMembers ?? 0,
      tone: 'success',
      trend: { value: 4, label: 'vs last week' },
      icon: iconWrap(UsersIcon, 'text-green-600 dark:text-green-300'),
      to: '/admin/users',
    },
    {
      label: 'Total Sections',
      value: stats?.totalSections ?? 0,
      tone: 'warning',
      trend: { value: 1, label: 'vs last week' },
      icon: iconWrap(FolderIcon, 'text-orange-700 dark:text-orange-300'),
      to: '/admin/sections',
    },
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? 0,
      tone: 'primary',
      trend: { value: 6, label: 'vs last week' },
      icon: iconWrap(GraduationIcon, 'text-violet-600 dark:text-violet-300'),
      to: '/admin/sections',
    },
    {
      label: 'Total Attendance',
      value: stats?.totalAttendance ?? 0,
      tone: 'success',
      trend: { value: 9, label: 'vs last week' },
      icon: iconWrap(ReportsIcon, 'text-green-600 dark:text-green-300'),
      to: '/admin/reports',
    },
    {
      label: "Today's Attendance",
      value: stats?.todayAttendance ?? 0,
      tone: 'danger',
      trend: { value: -2, label: 'vs yesterday' },
      icon: iconWrap(ReportsIcon, 'text-rose-600 dark:text-rose-300'),
      to: '/admin/reports',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
      {loading
        ? Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />)
        : cards.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={c.value}
              tone={c.tone}
              trend={c.trend}
              icon={c.icon}
              to={c.to}
            />
          ))}
    </div>
  );
};

DashboardCards.propTypes = {
  loading: PropTypes.bool,
  stats: PropTypes.object,
};

export default DashboardCards;
