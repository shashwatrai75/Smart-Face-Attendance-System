import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { MenuIcon } from './icons';

const Topbar = ({ pageTitle, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const offline = useOffline();
  const isOnline = offline?.isOnline ?? true;
  const isSyncing = offline?.isSyncing ?? false;

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
      <div className="flex w-full items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:hidden"
            title="Toggle sidebar"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {pageTitle}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300/70">
              <span className={['h-2 w-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-rose-500'].join(' ')} />
              <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
              {isSyncing && <span className="text-slate-400">· Syncing…</span>}
            </div>
          </div>
        </div>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 shadow-sm hover:bg-white transition-all duration-300 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-sm font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-slate-900 dark:text-white leading-5">
                {user?.name || 'User'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300/70">
                {user?.role === 'admin'
                  ? 'Office Admin'
                  : user?.role === 'superadmin'
                    ? 'Super Admin'
                    : user?.role === 'hr'
                      ? 'Supervisor'
                      : 'Lecturer'}
              </div>
            </div>
            <svg className={['h-4 w-4 text-slate-400 transition-transform', open ? 'rotate-180' : ''].join(' ')} viewBox="0 0 24 24" fill="none">
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/profile');
                }}
                className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-200 dark:hover:bg-white/5"
              >
                My Profile
              </button>
              <div className="h-px bg-slate-100 dark:bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

Topbar.propTypes = {
  pageTitle: PropTypes.string.isRequired,
  onToggleSidebar: PropTypes.func.isRequired,
};

export default Topbar;

