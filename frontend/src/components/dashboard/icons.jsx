import PropTypes from 'prop-types';

export const Icon = ({ children, className = 'h-5 w-5' }) => (
  <span className={className} aria-hidden="true">
    {children}
  </span>
);

Icon.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export const DashboardIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M4 13h7V4H4v9Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M13 20h7v-7h-7v7Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M13 11h7V4h-7v7Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 20h7v-5H4v5Z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const UsersIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const FolderIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v9A2.5 2.5 0 0 1 18 21H6a2.5 2.5 0 0 1-2.5-2.5v-11Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const HistoryIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M4 12a8 8 0 1 0 3-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ReportsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M7 17V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 17V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M17 17v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 21h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const ChevronIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MenuIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M4 7h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 12h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

