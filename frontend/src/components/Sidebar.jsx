import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const sectionLabelClass = 'text-xs uppercase text-gray-400 px-4 mt-4 mb-2 font-semibold tracking-wider';
const itemBase = 'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200';

const SvgIcon = ({ children }) => (
  <span className="h-5 w-5 inline-flex items-center justify-center" aria-hidden="true">
    {children}
  </span>
);

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 13h7V4H4v9Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 20h7v-7h-7v7Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 11h7V4h-7v7Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20h7v-5H4v5Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v9A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 12a8 8 0 1 0 3-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 17V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 17V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 17v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 21h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.2-2-3.4-2.2.7a8.4 8.4 0 0 0-1.7-1l-.2-2.3H10l-.2 2.3c-.6.2-1.2.5-1.7 1L5.9 6.4 3.9 9.8 6 11a7.9 7.9 0 0 0 0 2l-2.1 1.2 2 3.4 2.2-.7c.5.4 1.1.8 1.7 1l.2 2.3h4.2l.2-2.3c.6-.2 1.2-.5 1.7-1l2.2.7 2-3.4L19.4 13Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const role = user?.role || 'member';
  const roleKey = role === 'superadmin' ? 'superadmin' : role === 'admin' ? 'admin' : role === 'hr' ? 'hr' : 'member';

  const groups = [
    {
      title: 'MAIN',
      items: [
        { path: roleKey === 'admin' || roleKey === 'superadmin' ? '/admin/dashboard' : '/member/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { path: '/admin/users', label: 'Manage Users', iconKey: 'users', roles: ['admin', 'superadmin'] },
        { path: '/admin/sections', label: 'My Sections', iconKey: 'folder', roles: ['admin', 'superadmin'] },
        { path: '/member/enroll', label: 'Enroll Students', iconKey: 'folder', roles: ['member', 'admin', 'superadmin'] },
        { path: '/hr/enroll-employee', label: 'Enroll Employees', iconKey: 'users', roles: ['hr', 'superadmin'] },
      ],
    },
    {
      title: 'ATTENDANCE',
      items: [
        { path: '/member/attendance', label: 'Live Attendance', iconKey: 'camera', roles: ['member', 'admin', 'superadmin'] },
        { path: '/hr/attendance', label: 'Live Attendance', iconKey: 'camera', roles: ['hr', 'superadmin'] },
        { path: '/admin/history', label: 'History', iconKey: 'history', roles: ['admin', 'superadmin'] },
        { path: '/hr/history', label: 'History', iconKey: 'history', roles: ['hr', 'superadmin'] },
        { path: '/member/history', label: 'Member History', iconKey: 'history', roles: ['member', 'admin', 'superadmin'] },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        { path: '/admin/reports', label: 'Reports', iconKey: 'reports', roles: ['admin', 'superadmin'] },
        { path: '/member/reports', label: 'Member Reports', iconKey: 'reports', roles: ['member', 'admin', 'superadmin'] },
        { path: '/hr/reports', label: 'Reports', iconKey: 'reports', roles: ['hr', 'superadmin'] },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        { path: '/superadmin/system-settings', label: 'System Settings', iconKey: 'settings', roles: ['superadmin'] },
        { path: '/superadmin/admin-management', label: 'Office Admin Management', iconKey: 'users', roles: ['superadmin'] },
        { path: '/superadmin/audit-logs', label: 'Audit Logs', iconKey: 'history', roles: ['superadmin'] },
        { path: '/superadmin/danger-zone', label: 'Danger Zone', iconKey: 'settings', roles: ['superadmin'] },
      ],
    },
    {
      title: 'SUPERVISOR',
      items: [
        { path: '/hr/dashboard', label: 'Supervisor Dashboard', iconKey: 'dashboard', roles: ['hr', 'superadmin'] },
        { path: '/hr/enroll-employee', label: 'Supervisor Enroll Employee', iconKey: 'users', roles: ['hr', 'superadmin'] },
        { path: '/hr/face-scan', label: 'Supervisor Face Scan', iconKey: 'camera', roles: ['hr', 'superadmin'] },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.roles || it.roles.includes(roleKey)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-white/10">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
            <span className="text-sm font-semibold tracking-wide">SF</span>
          </div>
          <div>
            <div className="text-sm font-semibold">SmartFace</div>
            <div className="text-xs text-gray-400">Console</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-6">
        {groups.map((g) => (
          <div key={g.title}>
            <div className={sectionLabelClass}>{g.title}</div>
            <div className="space-y-1 px-2">
              {g.items.map((it) => (
                <Link
                  key={it.path}
                  to={it.path}
                  className={[
                    itemBase,
                    isActive(it.path) ? 'bg-indigo-600 text-white' : 'text-gray-200/80 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
                  <SvgIcon>{icons[it.iconKey] || icons.dashboard}</SvgIcon>
                  <span className="text-sm font-medium">{it.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-4 border-t border-white/10">
        <Link
          to="/profile"
          className={[
            itemBase,
            isActive('/profile') ? 'bg-indigo-600 text-white' : 'text-gray-200/80 hover:bg-slate-800 hover:text-white',
          ].join(' ')}
        >
          <span className="text-lg">👤</span>
          <span className="text-sm font-medium">Profile</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;

