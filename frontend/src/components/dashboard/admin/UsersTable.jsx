import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { UsersIcon } from '../icons';

const roleLabel = (role) => {
  if (role === 'member') return 'Lecturer';
  if (role === 'admin') return 'Office Admin';
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'hr') return 'Supervisor';
  return role || '—';
};

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function RoleBadge({ role }) {
  const r = role || '';
  const styles = {
    member: 'bg-green-100 text-green-800 ring-green-600/15 dark:bg-green-500/15 dark:text-green-200 dark:ring-green-400/25',
    admin: 'bg-violet-100 text-violet-800 ring-violet-600/15 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/25',
    superadmin:
      'bg-purple-100 text-purple-900 ring-purple-600/20 dark:bg-purple-500/20 dark:text-purple-100 dark:ring-purple-400/30',
    hr: 'bg-orange-100 text-orange-900 ring-orange-600/15 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/25',
  };
  const fallback =
    'bg-slate-100 text-slate-700 ring-slate-400/20 dark:bg-white/10 dark:text-slate-200 dark:ring-white/15';
  const key = r in styles ? r : null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${key ? styles[key] : fallback}`}
    >
      {roleLabel(r)}
    </span>
  );
}

RoleBadge.propTypes = {
  role: PropTypes.string,
};

const UsersTable = ({ loading, users }) => {
  const rows = Array.isArray(users) ? users.slice(0, 8) : [];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
            <UsersIcon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Recent users</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">Newest accounts in your organization.</p>
          </div>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 hover:shadow-md dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Manage all
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-gray-50/90 dark:border-white/10 dark:bg-white/[0.04]">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  User
                </th>
                <th className="hidden px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell dark:text-slate-400">
                  Email
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Role
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-5 py-4">
                      <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-14 text-center text-sm text-gray-500 dark:text-slate-400">
                    No users yet. Invite your team from User Management.
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  const id = u._id || u.id;
                  const active = (u.status || 'active') === 'active';
                  const name = u.name || '—';
                  return (
                    <tr
                      key={id || u.email}
                      className="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 ring-2 ring-white dark:bg-violet-500/25 dark:text-violet-100 dark:ring-slate-900"
                            aria-hidden
                          >
                            {getInitials(name)}
                          </span>
                          <Link
                            to="/admin/users"
                            className="text-sm font-semibold text-slate-900 transition hover:text-violet-600 dark:text-white dark:hover:text-violet-300"
                          >
                            {name}
                          </Link>
                        </div>
                      </td>
                      <td className="hidden max-w-[240px] truncate px-5 py-4 text-sm text-gray-600 lg:table-cell dark:text-slate-300">
                        {u.email || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            active
                              ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                          }`}
                        >
                          {active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

UsersTable.propTypes = {
  loading: PropTypes.bool,
  users: PropTypes.array,
};

export default UsersTable;
