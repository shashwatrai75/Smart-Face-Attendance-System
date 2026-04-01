import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  CameraIcon,
  ChevronIcon,
  ClipboardIcon,
  DashboardIcon,
  FolderIcon,
  GraduationIcon,
  HistoryIcon,
  Icon,
  PlusUserIcon,
  ReportsIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
  WarningIcon,
} from './icons';

const groupsForRole = (role) => {
  const isAdmin = role === 'admin';
  const isSuperadmin = role === 'superadmin';
  const isSupervisor = role === 'hr';
  const isMember = role === 'member' || (!isAdmin && !isSuperadmin && !isSupervisor);

  // Requested grouping. We filter per-role below.
  const groups = [
    {
      title: 'MAIN',
      items: [
        { to: isAdmin || isSuperadmin ? '/admin/dashboard' : '/member/dashboard', label: 'Dashboard', icon: DashboardIcon },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { to: '/admin/users', label: 'Manage Users', icon: UsersIcon, roles: ['admin', 'superadmin'] },
        { to: '/admin/sections', label: 'My Sections', icon: FolderIcon, roles: ['admin', 'superadmin'] },
        { to: '/member/dashboard', label: 'My Sections', icon: FolderIcon, roles: ['member'] },
        { to: '/member/enroll', label: 'Enroll Students', icon: GraduationIcon, roles: ['member', 'admin', 'superadmin'] },
        { to: '/hr/enroll-employee', label: 'Enroll Employees', icon: PlusUserIcon, roles: ['hr', 'superadmin'] },
        { to: '/admin/enroll-employee', label: 'Enroll Employees', icon: PlusUserIcon, roles: ['superadmin'] },
      ],
    },
    {
      title: 'ATTENDANCE',
      items: [
        { to: '/member/attendance', label: 'Live Attendance', icon: CameraIcon, roles: ['member', 'admin', 'superadmin'] },
        { to: '/admin/history', label: 'History', icon: HistoryIcon, roles: ['admin', 'superadmin'] },
        { to: '/hr/history', label: 'History', icon: HistoryIcon, roles: ['hr', 'superadmin'] },
        { to: '/member/history', label: 'Member History', icon: HistoryIcon, roles: ['member', 'admin', 'superadmin'] },
        { to: '/hr/attendance', label: 'Live Attendance', icon: CameraIcon, roles: ['hr', 'superadmin'] },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        { to: '/admin/reports', label: 'Reports', icon: ReportsIcon, roles: ['admin', 'superadmin'] },
        { to: '/member/reports', label: 'Member Reports', icon: ReportsIcon, roles: ['member', 'admin', 'superadmin'] },
        { to: '/hr/reports', label: 'Reports', icon: ReportsIcon, roles: ['hr', 'superadmin'] },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        { to: '/superadmin/system-settings', label: 'System Settings', icon: SettingsIcon, roles: ['superadmin'] },
        { to: '/superadmin/admin-management', label: 'Office Admin Management', icon: ShieldIcon, roles: ['superadmin'] },
        { to: '/superadmin/audit-logs', label: 'Audit Logs', icon: ClipboardIcon, roles: ['superadmin'] },
        { to: '/superadmin/danger-zone', label: 'Danger Zone', icon: WarningIcon, roles: ['superadmin'] },
      ],
    },
    {
      title: 'SUPERVISOR',
      items: [
        { to: '/hr/dashboard', label: 'Supervisor Dashboard', icon: DashboardIcon, roles: ['hr', 'superadmin'] },
        { to: '/hr/enroll-employee', label: 'Supervisor Enroll Employee', icon: PlusUserIcon, roles: ['hr', 'superadmin'] },
        { to: '/hr/face-scan', label: 'Supervisor Face Scan', icon: CameraIcon, roles: ['hr', 'superadmin'] },
      ],
    },
  ];

  const roleKey = isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : isSupervisor ? 'hr' : 'member';
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.roles || it.roles.includes(roleKey)),
    }))
    .filter((g) => g.items.length > 0);

  // For supervisors, keep it simpler by hiding admin-only groups.
  if (isSupervisor && !isSuperadmin) return visible.filter((g) => g.title !== 'ADMIN');
  if (isMember && !isAdmin && !isSuperadmin) return visible.filter((g) => g.title !== 'ADMIN' && g.title !== 'SUPERVISOR');
  return visible;
};

const SidebarNav = ({ collapsed, onToggleCollapsed }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const groups = groupsForRole(user?.role);

  const isActive = (to) => pathname === to || (to !== '/' && pathname.startsWith(`${to}/`));

  return (
    <aside
      className={[
        'relative hidden shrink-0 border-r border-white/5 bg-slate-900 text-slate-100 lg:flex lg:flex-col',
        collapsed ? 'w-[76px]' : 'w-64',
        'transition-[width] duration-200',
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
                <div className="px-3 pb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
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
                        'group flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200',
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-200/80 hover:bg-slate-800 hover:text-white',
                      ].join(' ')}
                    >
                      <ItemIcon className="h-5 w-5" />
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

