import PropTypes from 'prop-types';

const tones = {
  indigo:
    'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-200 dark:ring-violet-400/25',
  green:
    'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/25',
  rose: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/25',
};

const TeacherStatsCards = ({ totalStudents, presentToday, absentToday, loading }) => {
  const cards = [
    {
      label: 'Total students',
      value: totalStudents,
      tone: 'indigo',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 21v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Present today',
      value: presentToday,
      tone: 'green',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Absent today',
      value: absentToday,
      tone: 'rose',
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{c.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {loading ? '—' : c.value}
              </p>
            </div>
            <div
              className={[
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                tones[c.tone],
              ].join(' ')}
            >
              {c.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

TeacherStatsCards.propTypes = {
  totalStudents: PropTypes.number,
  presentToday: PropTypes.number,
  absentToday: PropTypes.number,
  loading: PropTypes.bool,
};

export default TeacherStatsCards;
