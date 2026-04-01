import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import TypeBadge from './TypeBadge';

const IconButton = ({ title, tone = 'neutral', onClick, children }) => {
  const toneCls =
    tone === 'danger'
      ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10'
      : tone === 'primary'
        ? 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10'
        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5';

  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={['inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors', toneCls].join(' ')}
    >
      {children}
    </button>
  );
};

IconButton.propTypes = {
  title: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['neutral', 'primary', 'danger']),
  onClick: PropTypes.func,
  children: PropTypes.node,
};

const PencilIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13.5 6.5 17.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M6 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 7l1 14h6l1-14" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M10.5 11v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M13.5 11v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CogIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M19.4 15a8.5 8.5 0 0 0 .1-1l2-1.2-2-3.5-2.2.5a8.6 8.6 0 0 0-1.7-1L14.5 6h-5L8.4 8.8a8.6 8.6 0 0 0-1.7 1L4.5 9.3l-2 3.5 2 1.2a8.5 8.5 0 0 0 .1 1 8.5 8.5 0 0 0-.1 1l-2 1.2 2 3.5 2.2-.5a8.6 8.6 0 0 0 1.7 1L9.5 18h5l1.1-2.8a8.6 8.6 0 0 0 1.7-1l2.2.5 2-3.5-2-1.2a8.5 8.5 0 0 0-.1-1Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity="0.8"
    />
  </svg>
);

const SectionCard = ({ section, subtitle, rightMeta, onEdit, onDelete }) => {
  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge sectionType={section.sectionType} />
            {section.hasSubclasses ? (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-200">Container</span>
            ) : null}
          </div>
          <div className="mt-2 truncate text-base font-semibold text-slate-900 dark:text-white">
            {section.sectionName}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
              {subtitle}
            </div>
          ) : null}
          {rightMeta ? (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
              {rightMeta}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/admin/sections/${section._id}`}
            title="Manage"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <CogIcon className="h-5 w-5" />
          </Link>
          <IconButton title="Edit" tone="neutral" onClick={onEdit}>
            <PencilIcon className="h-5 w-5" />
          </IconButton>
          <IconButton title="Delete" tone="danger" onClick={onDelete}>
            <TrashIcon className="h-5 w-5" />
          </IconButton>
        </div>
      </div>
    </div>
  );
};

SectionCard.propTypes = {
  section: PropTypes.object.isRequired,
  subtitle: PropTypes.string,
  rightMeta: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};

export default SectionCard;

