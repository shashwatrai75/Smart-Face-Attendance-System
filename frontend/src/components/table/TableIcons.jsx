import PropTypes from 'prop-types';

export const IconWrap = ({ children, className = 'h-4 w-4' }) => (
  <span className={className} aria-hidden="true">
    {children}
  </span>
);

IconWrap.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

export const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M16.6 16.6 21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const SortIcon = ({ direction = 'none', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M8 9h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M10 13h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 17h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {direction === 'asc' ? (
      <path d="M6.5 16V8.5l-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ) : direction === 'desc' ? (
      <path d="M6.5 8v7.5l-2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ) : null}
  </svg>
);

SortIcon.propTypes = {
  direction: PropTypes.oneOf(['none', 'asc', 'desc']),
};

export const EyeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const EditIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13.5 6.5 17.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M6 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 7l1 14h6l1-14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M10.5 11v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M13.5 11v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

