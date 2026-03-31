import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronIcon, DashboardIcon, FolderIcon, HistoryIcon, Icon, ReportsIcon, UsersIcon } from './icons';

const groupsForRole = (role) => {
  if (role !== 'admin' && role !== 'superadmin') {
    return [
      {
        title: 'Dashboard',
        items: [{ to: '/member/dashboard', label: 'Dashboard', icon: DashboardIcon }],
      },
    ];
  }

  return [
    {
      title: 'Dashboard',
      items: [{ to: '/admin/dashboard', label: 'Overview', icon: DashboardIcon }],
    },
    {
      title: 'Management',
      items: [
        { to: '/admin/users', label: 'Users', icon: UsersIcon },
        { to: '/admin/sections', label: 'Sections', icon: FolderIcon },
      ],
    },
    {
      title: 'Reports',
      items: [
        { to: '/admin/history', label: 'History', icon: HistoryIcon },
        { to: '/admin/reports', label: 'Reports', icon: ReportsIcon },
      ],
    },
  ];
};

const SidebarNav = ({ collapsed, onToggleCollapsed }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const groups = groupsForRole(user?.role);

  const isActive = (to) => pathname === to;

  return (
    <aside
      className={[
        'relative hidden shrink-0 border-r border-white/5 bg-slate-900 text-slate-100 lg:flex lg:flex-col',
        collapsed ? 'w-[76px]' : 'w-[280px]',
        'transition-[width] duration-300',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/25 via-indigo-500/25 to-fuchsia-500/20 ring-1 ring-white/10 shadow-[0_12px_40px_rgba(99,102,241,0.18)] flex items-center justify-center">
            <span className="text-sm font-semibold tracking-wide">SF</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">SmartFace</div>
              <div className="truncate text-xs text-slate-300/70">Admin Console</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="group rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon className={['h-5 w-5 transition-transform duration-300', collapsed ? 'rotate-180' : ''].join(' ')}>
            <ChevronIcon className="h-5 w-5" />
          </Icon>
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="h-px bg-white/10" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-6">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-300/60 uppercase">
                  {group.title}
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.to);
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={[
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300',
                        active
                          ? 'bg-white/10 text-white ring-1 ring-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.25)]'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                          active ? 'bg-indigo-500/20 text-indigo-100' : 'bg-white/5 text-slate-200/80 group-hover:bg-white/10',
                        ].join(' ')}
                      >
                        <ItemIcon className="h-5 w-5" />
                      </div>
                      {!collapsed && (
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.label}</div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto px-2 pb-4">
        <Link
          to="/profile"
          title={collapsed ? 'Profile' : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white transition-all duration-300"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
            <span className="text-sm">👤</span>
          </div>
          {!collapsed && <span className="text-sm font-medium">Profile</span>}
        </Link>
      </div>
    </aside>
  );
};

SidebarNav.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  onToggleCollapsed: PropTypes.func.isRequired,
};

export default SidebarNav;

