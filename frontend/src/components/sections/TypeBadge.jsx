import PropTypes from 'prop-types';

const TypeBadge = ({ sectionType }) => {
  const key = (sectionType || '').toLowerCase();
  const isClass = key === 'class';

  const cls = isClass
    ? 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-300/20'
    : 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20';

  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1', cls].join(' ')}>
      {isClass ? 'Class' : 'Department'}
    </span>
  );
};

TypeBadge.propTypes = {
  sectionType: PropTypes.string,
};

export default TypeBadge;

