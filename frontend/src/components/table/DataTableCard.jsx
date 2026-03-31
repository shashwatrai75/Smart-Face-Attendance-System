import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import Pagination from './Pagination';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { EditIcon, EyeIcon, SearchIcon, SortIcon, TrashIcon } from './TableIcons';

const cx = (...v) => v.filter(Boolean).join(' ');

const ActionIconButton = ({ title, onClick, tone = 'neutral', children }) => {
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
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors', toneCls)}
    >
      {children}
    </button>
  );
};

ActionIconButton.propTypes = {
  title: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  tone: PropTypes.oneOf(['neutral', 'primary', 'danger']),
  children: PropTypes.node,
};

const TableSkeleton = ({ rows = 6 }) => {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className={cx('border-t border-slate-200/70 dark:border-white/10', idx % 2 ? 'bg-slate-50/40 dark:bg-white/[0.03]' : '')}>
          {Array.from({ length: 7 }).map((__, c) => (
            <td key={c} className="px-4 py-4">
              <div className="h-3 w-full max-w-[160px] animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

TableSkeleton.propTypes = {
  rows: PropTypes.number,
};

const DataTableCard = ({
  title = 'Students',
  rows = [],
  loading = false,
  onRowClick,
  classOptions = [],
  sectionOptions = [],
  dateOptions = [],
}) => {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [selected, setSelected] = useState(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => {
      const matchQ =
        !q ||
        (r.name || '').toLowerCase().includes(q) ||
        String(r.roll || '').toLowerCase().includes(q) ||
        String(r.id || '').toLowerCase().includes(q);
      const matchClass = !classFilter || r.className === classFilter;
      const matchSection = !sectionFilter || r.section === sectionFilter;
      const matchDate = !dateFilter || r.date === dateFilter;
      return matchQ && matchClass && matchSection && matchDate;
    });
  }, [rows, query, classFilter, sectionFilter, dateFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dirMul = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = a?.[sort.key];
      const bv = b?.[sort.key];
      const as = av == null ? '' : String(av).toLowerCase();
      const bs = bv == null ? '' : String(bv).toLowerCase();
      if (as < bs) return -1 * dirMul;
      if (as > bs) return 1 * dirMul;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => sorted.slice((safePage - 1) * pageSize, safePage * pageSize), [sorted, safePage]);

  const allVisibleIds = useMemo(() => paged.map((r) => r.id), [paged]);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const someVisibleSelected = allVisibleIds.some((id) => selected.has(id));

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setSortKey = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortDir = (key) => (sort.key === key ? sort.dir : 'none');

  const selectedCount = selected.size;

  const bulkEnabled = selectedCount > 0;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
            Search, filter, sort, and manage records at scale.
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300/50">
              <SearchIcon className="h-4 w-4" />
            </div>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, ID, roll…"
              className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100 dark:placeholder:text-slate-400/60"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
          >
            <option value="">All Classes</option>
            {classOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
          >
            <option value="">All Sections</option>
            {sectionOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
          >
            <option value="">All Dates</option>
            {dateOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-300/70">
          {bulkEnabled ? (
            <span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedCount}</span> selected
            </span>
          ) : (
            <span>Select rows for bulk actions</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!bulkEnabled}
            title={bulkEnabled ? 'Bulk delete' : 'Select rows to enable'}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-white/5"
            onClick={() => {
              // UI only; connect to API later
              setSelected(new Set());
            }}
          >
            Bulk Delete
          </button>
          <button
            type="button"
            disabled={!bulkEnabled}
            title={bulkEnabled ? 'Mark attendance' : 'Select rows to enable'}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            onClick={() => {
              // UI only; connect to API later
              setSelected(new Set());
            }}
          >
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10">
        <table className="min-w-[980px] w-full border-collapse bg-white dark:bg-slate-950/20">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-300/70">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                  }}
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-2 focus:ring-purple-400/60 dark:border-white/20 dark:bg-white/5"
                  aria-label="Select all rows"
                />
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey('name')} className="inline-flex items-center gap-2 hover:text-slate-700 dark:hover:text-white" title="Sort by name">
                  Name
                  <SortIcon className="h-4 w-4" direction={sortDir('name')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey('roll')} className="inline-flex items-center gap-2 hover:text-slate-700 dark:hover:text-white" title="Sort by ID / Roll">
                  ID / Roll
                  <SortIcon className="h-4 w-4" direction={sortDir('roll')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey('section')} className="inline-flex items-center gap-2 hover:text-slate-700 dark:hover:text-white" title="Sort by section">
                  Class / Section
                  <SortIcon className="h-4 w-4" direction={sortDir('section')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey('date')} className="inline-flex items-center gap-2 hover:text-slate-700 dark:hover:text-white" title="Sort by date">
                  Date
                  <SortIcon className="h-4 w-4" direction={sortDir('date')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => setSortKey('status')} className="inline-flex items-center gap-2 hover:text-slate-700 dark:hover:text-white" title="Sort by status">
                  Status
                  <SortIcon className="h-4 w-4" direction={sortDir('status')} />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          {loading ? (
            <TableSkeleton rows={7} />
          ) : paged.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7} className="p-6">
                  <EmptyState />
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="text-sm text-slate-700 dark:text-slate-200">
              {paged.map((r, idx) => (
                <tr
                  key={r.id}
                  onClick={() => onRowClick?.(r)}
                  className={cx(
                    'cursor-pointer border-t border-slate-200/70 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]',
                    idx % 2 ? 'bg-slate-50/30 dark:bg-white/[0.02]' : ''
                  )}
                  title="Click to view details"
                >
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleRow(r.id)}
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-2 focus:ring-purple-400/60 dark:border-white/20 dark:bg-white/5"
                      aria-label={`Select ${r.name}`}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center text-xs font-semibold">
                        {(r.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-white">{r.name}</div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-300/70">{r.email || '—'}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                    {r.roll || r.id}
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-slate-900 dark:text-white font-semibold">{r.className}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300/70">{r.section}</div>
                  </td>

                  <td className="px-4 py-4">{r.date}</td>

                  <td className="px-4 py-4">
                    <StatusBadge status={r.status} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <ActionIconButton title="View" onClick={() => {}} tone="primary">
                        <EyeIcon className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton title="Edit" onClick={() => {}} tone="neutral">
                        <EditIcon className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton title="Delete" onClick={() => {}} tone="danger">
                        <TrashIcon className="h-4 w-4" />
                      </ActionIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-5">
        <Pagination page={safePage} pageSize={pageSize} total={total} onChange={setPage} />
      </div>
    </div>
  );
};

DataTableCard.propTypes = {
  title: PropTypes.string,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      email: PropTypes.string,
      roll: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      className: PropTypes.string,
      section: PropTypes.string,
      date: PropTypes.string,
      status: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  onRowClick: PropTypes.func,
  classOptions: PropTypes.arrayOf(PropTypes.string),
  sectionOptions: PropTypes.arrayOf(PropTypes.string),
  dateOptions: PropTypes.arrayOf(PropTypes.string),
};

export default DataTableCard;

