import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import SidebarNav from './SidebarNav';
import Topbar from './Topbar';

const STORAGE_KEY = 'sf:sidebarCollapsed';

const DashboardLayout = ({ pageTitle, children }) => {
  const initialCollapsed = useMemo(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <SidebarNav collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar pageTitle={pageTitle} onToggleSidebar={toggleCollapsed} />
          <main className="flex-1">
            <div className="w-full px-6 py-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

DashboardLayout.propTypes = {
  pageTitle: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default DashboardLayout;

