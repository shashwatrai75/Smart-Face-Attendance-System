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

export const CameraIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M4 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M16 10l6-3v10l-6-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const PlusUserIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 21v-1a8 8 0 0 1 10-7.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M17 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const GraduationIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 3 2 8l10 5 10-5-10-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M22 8v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const SettingsIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.2-2-3.4-2.2.7a8.4 8.4 0 0 0-1.7-1l-.2-2.3H10l-.2 2.3c-.6.2-1.2.5-1.7 1L5.9 6.4 3.9 9.8 6 11a7.9 7.9 0 0 0 0 2l-2.1 1.2 2 3.4 2.2-.7c.5.4 1.1.8 1.7 1l.2 2.3h4.2l.2-2.3c.6-.2 1.2-.5 1.7-1l2.2.7 2-3.4L19.4 13Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const ShieldIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M12 3 20 7v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V7l8-4Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export const ClipboardIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M9 4h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="M8 6h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M9 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const WarningIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M12 3 22 20H2L12 3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M12 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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

