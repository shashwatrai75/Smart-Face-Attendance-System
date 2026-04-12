import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const actions = [
  {
    to: '/member/enroll',
    title: 'Enroll students',
    description: 'Add students to your sections.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    gradient: 'from-violet-600 to-purple-700',
  },
  {
    to: '/member/attendance',
    title: 'Start attendance',
    description: 'Open live attendance for scanning.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M16 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
    gradient: 'from-emerald-600 to-teal-700',
  },
  {
    to: '/member/reports',
    title: 'View reports',
    description: 'Summaries and class insights.',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 17V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 17V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M17 17v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5 21h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-600',
  },
];

const TeacherQuickActions = ({ disableStart, onStartClick }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
    {actions.map((a, idx) => {
      const isStart = idx === 1;
      if (isStart && onStartClick) {
        return (
          <button
            key={a.title}
            type="button"
            onClick={onStartClick}
            disabled={disableStart}
            className={`group relative flex flex-col overflow-hidden rounded-xl bg-gradient-to-br ${a.gradient} p-4 text-left text-white shadow-sm transition-all duration-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
              {a.icon}
            </span>
            <span className="mt-3 font-semibold">{a.title}</span>
            <span className="mt-1 text-sm text-white/85">{a.description}</span>
          </button>
        );
      }
      return (
        <Link
          key={a.to}
          to={a.to}
          className={`group relative flex flex-col overflow-hidden rounded-xl bg-gradient-to-br ${a.gradient} p-4 text-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30 transition group-hover:scale-105">
            {a.icon}
          </span>
          <span className="mt-3 font-semibold">{a.title}</span>
          <span className="mt-1 text-sm text-white/85">{a.description}</span>
        </Link>
      );
    })}
  </div>
);

TeacherQuickActions.propTypes = {
  disableStart: PropTypes.bool,
  onStartClick: PropTypes.func,
};

export default TeacherQuickActions;
