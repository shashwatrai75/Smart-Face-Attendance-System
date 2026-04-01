import { useMemo, useState, useEffect } from 'react';
import { purgeAttendance, purgeData, getSections } from '../../api/api';
import Toast from '../../components/Toast';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import PageHeader from '../../components/userManagement/PageHeader';

const DangerZone = () => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purgeType, setPurgeType] = useState('attendance');
  const [sectionId, setSectionId] = useState('');
  const [sections, setSections] = useState([]);
  const [confirmText, setConfirmText] = useState('');
  const [modal, setModal] = useState(null); // { kind: 'attendance' | 'system' }

  useEffect(() => {
    getSections().then((r) => setSections(r.sections || [])).catch(() => setSections([]));
  }, []);

  const selectedSectionLabel = useMemo(() => {
    if (!sectionId) return 'All sections';
    const s = sections.find((x) => String(x._id || x.id) === String(sectionId));
    return s?.sectionName || 'Selected section';
  }, [sectionId, sections]);

  const canProceed = confirmText.trim() === 'PURGE' && !loading;

  const handlePurgeAttendance = async () => {
    if (confirmText !== 'PURGE') return;
    setLoading(true);
    try {
      await purgeAttendance(sectionId ? { sectionId } : {});
      setToast({ message: 'Attendance purged successfully', type: 'success' });
      setConfirmText('');
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Purge failed', type: 'error' });
    } finally { setLoading(false); }
  };

  const handlePurgeData = async () => {
    if (confirmText !== 'PURGE' || !purgeType) return;
    setLoading(true);
    try {
      await purgeData(purgeType);
      setToast({ message: 'Data purged successfully', type: 'success' });
      setConfirmText('');
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Purge failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout pageTitle="Danger Zone">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader
          title="Danger Zone"
          subtitle="Irreversible actions. Proceed with caution."
          actions={
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">
              <span aria-hidden="true">⚠</span>
              Destructive
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6">
          {/* Purge attendance */}
          <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm space-y-4 dark:border-rose-300/20 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">
                <span className="text-base" aria-hidden="true">⚠</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Purge Attendance</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Delete attendance records permanently.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Section</div>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                >
                  <option value="">All sections</option>
                  {sections.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.sectionName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-300/70">Applies to: {selectedSectionLabel}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Confirmation</div>
                  <span className="group relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-200">
                    ?
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                      Type <span className="font-semibold">PURGE</span> to unlock the destructive button.
                    </span>
                  </span>
                </div>
                <input
                  placeholder='Type "PURGE" to confirm'
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmText('')}
                disabled={loading || !confirmText}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setModal({ kind: 'attendance' })}
                disabled={!canProceed}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Purging…' : 'Purge Attendance'}
              </button>
            </div>
          </div>

          {/* Purge system data */}
          <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm space-y-4 dark:border-rose-300/20 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">
                <span className="text-base" aria-hidden="true">⚠</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Purge System Data</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                  Delete sessions and/or attendance data. <span className="font-semibold text-rose-700 dark:text-rose-200">This action cannot be undone.</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Scope</div>
                <select
                  value={purgeType}
                  onChange={(e) => setPurgeType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                >
                  <option value="sessions">Sessions only</option>
                  <option value="attendance">Attendance only</option>
                  <option value="all">All (sessions + attendance)</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  Choose carefully. This affects system-wide data.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Confirmation</div>
                <input
                  placeholder='Type "PURGE" to confirm'
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm transition-all duration-200 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-white/10 dark:bg-slate-950/30 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-300/70">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmText('')}
                disabled={loading || !confirmText}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setModal({ kind: 'system' })}
                disabled={!canProceed}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Purging…' : 'Purge System Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation modal */}
        {modal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => (loading ? null : setModal(null))} />
            <div className="relative w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl dark:border-rose-300/20 dark:bg-slate-950">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">
                  <span aria-hidden="true">⚠</span>
                </div>
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900 dark:text-white">Final confirmation</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300/70">
                    {modal.kind === 'attendance' ? (
                      <>
                        You are about to permanently delete attendance records for{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{selectedSectionLabel}</span>.
                      </>
                    ) : (
                      <>
                        You are about to purge system data with scope{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">{purgeType}</span>. This action cannot be undone.
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-300/20 dark:bg-rose-400/10 dark:text-rose-200">
                Type check passed: <span className="font-semibold">PURGE</span>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/30 dark:text-white dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (modal.kind === 'attendance') await handlePurgeAttendance();
                    else await handlePurgeData();
                    setModal(null);
                  }}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default DangerZone;
