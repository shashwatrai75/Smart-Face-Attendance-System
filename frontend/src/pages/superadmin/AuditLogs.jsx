import { useMemo, useState, useEffect } from 'react';
import { getAuditLogs } from '../../api/api';
import Loader from '../../components/Loader';
import Toast from '../../components/Toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import PageHeader from '../../components/userManagement/PageHeader';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, dateFrom, dateTo, limit]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      const res = await getAuditLogs(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Failed to load audit logs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  const actions = [
    'LOGIN',
    'LOGOUT',
    'CREATE_USER',
    'UPDATE_USER',
    'DELETE_USER',
    'PURGE_ATTENDANCE',
    'PURGE_DATA',
    'UPDATE_SYSTEM_SETTINGS',
    'DELETE_SECTION',
    'EXPORT_REPORT',
  ];

  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const filteredLogs = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return logs;
    return (logs || []).filter((log) => {
      const actor = log.actorUserId?.name || log.actorUserId?.email || log.actorUserId || '';
      const meta = log.metadata ? JSON.stringify(log.metadata) : '';
      const action = log.action || '';
      return (
        String(actor).toLowerCase().includes(q) ||
        String(action).toLowerCase().includes(q) ||
        String(meta).toLowerCase().includes(q)
      );
    });
  }, [logs, query]);

  const ActionBadge = ({ action }) => {
    const a = String(action || '').toUpperCase();
    const cls =
      a.includes('DELETE') || a.includes('PURGE')
        ? 'bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20'
        : a.includes('UPDATE')
          ? 'bg-amber-500/10 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20'
          : a.includes('LOGIN')
            ? 'bg-blue-500/10 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-200 dark:ring-blue-300/20'
            : a.includes('LOGOUT')
              ? 'bg-slate-500/10 text-slate-700 ring-slate-600/20 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10'
              : 'bg-indigo-500/10 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-300/20';
    return (
      <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', cls].join(' ')}>
        {a || '—'}
      </span>
    );
  };

  return (
    <DashboardLayout pageTitle="Audit Logs">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="space-y-6">
        <PageHeader
          title="Audit Logs"
          subtitle="Track all system activities"
          actions={
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          }
        />

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70 mb-2">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search actor, action, metadata…"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70 mb-2">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300/70 mb-2">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-300/70">
              Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredLogs.length}</span> rows on this page
              {total ? (
                <>
                  {' '}
                  • <span className="font-semibold text-slate-900 dark:text-white">{total}</span> total
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Rows</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10) || 25);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-slate-900/40">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100 dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300/70">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300/70">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300/70">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-300/70">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-300/70">
                          No audit logs found
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const actor = log.actorUserId?.name || log.actorUserId?.email || log.actorUserId || '—';
                        const initial = String(actor || '?').trim().slice(0, 1).toUpperCase();
                        const metaStr = log.metadata && Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : '—';
                        return (
                          <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300/70">
                              {formatDate(log.createdAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold dark:bg-white dark:text-slate-900">
                                  {initial}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{actor}</div>
                                  {log.actorUserId?.email ? (
                                    <div className="truncate text-xs text-slate-500 dark:text-slate-300/70">{log.actorUserId.email}</div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <ActionBadge action={log.action} />
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300/70 max-w-[520px]">
                              <span className="block truncate" title={metaStr}>
                                {metaStr}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-300/70">
                  Page <span className="font-semibold text-slate-900 dark:text-white">{page}</span> of{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogs;
