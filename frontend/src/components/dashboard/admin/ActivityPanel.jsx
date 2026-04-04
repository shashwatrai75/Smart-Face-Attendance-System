import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ClipboardIcon, DashboardIcon, HistoryIcon, PlusUserIcon, ShieldIcon, UsersIcon } from '../icons';

const ActivityPanel = ({ loading, stats }) => {
  const items = !stats
    ? []
    : [
        {
          title: 'Dashboard metrics refreshed',
          meta: 'Just now',
          hint: 'Live counts from your workspace',
          icon: DashboardIcon,
          iconWrap: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
        },
        {
          title: `${stats.newUsersThisMonth ?? 0} new users this month`,
          meta: 'User growth',
          hint: 'Based on account creation dates',
          icon: PlusUserIcon,
          iconWrap: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200',
        },
        {
          title: `${stats.verifiedUsers ?? 0} verified accounts`,
          meta: 'Trust and onboarding',
          hint: 'Users who completed verification',
          icon: ShieldIcon,
          iconWrap: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200',
        },
        {
          title: `${stats.usersWithRecentLogin ?? 0} users active in the last 30 days`,
          meta: 'Engagement',
          hint: 'Signed in recently',
          icon: UsersIcon,
          iconWrap: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
        },
      ];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <ClipboardIcon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Recent activity</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-slate-400">
              Highlights from your latest data sync.
            </p>
          </div>
        </div>
        <Link
          to="/admin/history"
          className="shrink-0 rounded-xl p-2.5 text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
          aria-label="View attendance history"
        >
          <HistoryIcon className="h-5 w-5" />
        </Link>
      </div>

      <ul className="mt-6 space-y-3">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((k) => (
              <li
                key={k}
                className="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5"
              >
                <div className="flex gap-3">
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200 dark:bg-white/10" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-4 w-3/4 max-w-xs rounded bg-slate-200 dark:bg-white/10" />
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
                  </div>
                </div>
              </li>
            ))}
          </>
        ) : items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-gray-500 dark:border-white/10 dark:text-slate-400">
            No activity to show yet.
          </li>
        ) : (
          items.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="group rounded-xl border border-slate-100 bg-gray-50/80 px-4 py-4 transition-all duration-200 hover:border-violet-200/80 hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-violet-500/30 dark:hover:bg-slate-900/60"
              >
                <div className="flex gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10 ${item.iconWrap}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                      {item.meta}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-slate-400">{item.hint}</p>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

ActivityPanel.propTypes = {
  loading: PropTypes.bool,
  stats: PropTypes.object,
};

export default ActivityPanel;
