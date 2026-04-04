import { Link } from 'react-router-dom';
import { FolderIcon, ReportsIcon, UsersIcon } from '../icons';

const actions = [
  {
    to: '/admin/sections',
    title: 'Manage sections',
    description: 'Create classes, departments, and schedules.',
    gradient: 'from-violet-600 to-purple-700',
    ring: 'focus:ring-violet-400/50',
    icon: FolderIcon,
  },
  {
    to: '/admin/users',
    title: 'User management',
    description: 'Roles, access, and onboarding in one place.',
    gradient: 'from-green-600 to-emerald-700',
    ring: 'focus:ring-green-400/50',
    icon: UsersIcon,
  },
  {
    to: '/admin/reports',
    title: 'Reports and exports',
    description: 'Attendance analytics and downloadable summaries.',
    gradient: 'from-orange-500 to-amber-600',
    ring: 'focus:ring-orange-400/50',
    icon: ReportsIcon,
  },
];

const DashboardQuickActions = () => (
  <section className="space-y-4">
    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Quick actions</h2>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {actions.map(({ to, title, description, gradient, ring, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-6 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-950 ${ring}`}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl transition-opacity duration-300 group-hover:opacity-90" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/35 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
              <Icon className="h-6 w-6 text-white" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/90">{description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-white">
                Open
                <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

export default DashboardQuickActions;
